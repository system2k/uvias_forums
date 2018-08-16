function escapeBody(body){
	return body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>").replace(/\s/g, "&nbsp;")
}

module.exports = function(req, res, swig, database, id, parseCookie, userinfo, date_created) {
	var tmp = swig.compileFile("./src/html/thread.html")
	
	database.get("select * from threads where id=?", [id], function(a, b){
		if(typeof a === "object" && a !== null || b === undefined) {
			res.write("Thread not found")
			res.end()
		} else {
			if(b.type == 0){
				database.get("select name from subforums where id=?", [b.subforum], function(err, sf){
					var posts = [
						{
							username: b.user,
							title: b.title,
							post_date: date_created(b.date_created),
							body: escapeBody(b.body),
							replyurl: "/reply/" + id,
							postcount: 0,
							consolas: !!b.font
						}
					]
					
					database.all("select * from threads where type=1 and parent=?", [id], function(a,replies){
						for(i in replies){
							posts.push({
								username: replies[i].user,
								title: replies[i].title,
								post_date: date_created(replies[i].date_created),
								body: escapeBody(replies[i].body),
								replyurl: "/reply/" + id,
								postcount: 0,
								consolas: !!replies[i].font
							})
						}
						var usernames = [];
						var postcounts = [];
						var indx = 0;
						function getall(){
							database.get("select * from users where id=?", [posts[indx].username], function(a,usr){
								indx++;
								usernames.push(usr.username)
								postcounts.push(usr.posts)
								if(posts.length > indx){
									getall()
								} else {
									complete()
								}
							})
						}
						getall()
						function complete(){
							for(i in usernames){
								posts[i].username = usernames[i]
								posts[i].postcount = postcounts[i]
							}
							var output = tmp(Object.assign({
								subforum_name: sf.name,
								logged_in: userinfo.loggedin,
								thread_title: b.title,
								posts: posts
							}, userinfo));
							
							res.write(output)
							res.end()
						}
					})
				})
			} else {
				module.exports(req, res, swig, database, b.parent, parseCookie, userinfo, date_created)
			}
		}
	})
}