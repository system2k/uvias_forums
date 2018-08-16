function escapeBody(body){
	return body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>").replace(/\s/g, "&nbsp;")
}

var Month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
var _data_ago = ["minute", "hour", "day", "month", "year"]
function joindate_label(timestamp){
	timestamp = parseInt(timestamp)
	timestamp = new Date(timestamp)
	
	var mth = Month[timestamp.getMonth()]
	var day = ("0" + timestamp.getDate()).slice(-2)
	var yer = timestamp.getFullYear()
	
	
	return mth + " " + day + ", " + yer
}

module.exports = function(req, res, swig, database, id, parseCookie, userinfo, date_created, querystring, online_users) {
	var method = req.method.toLowerCase()
	if(method == "get"){
		var tmp = swig.compileFile("./src/html/thread.html")
		
		database.get("select * from threads where id=? and deleted = 0", [id], function(a, b){
			if(typeof a === "object" && a !== null || b === undefined) {
				res.write("Thread not found")
				res.end()
			} else {
				var next_thread_id;
				var prev_thread_id;
				
				database.get("select * from threads where subforum = ? and type = 0 and deleted = 0 and _order < ? order by _order desc limit 1", [b.subforum, b._order], function(a,next){
					if(!next) {
						next_thread_id = id
					} else {
						next_thread_id = next.id
					}
					database.get("select * from threads where subforum = ? and type = 0 and deleted = 0 and _order > ? order by _order limit 1", [b.subforum, b._order], function(a, prev){
						if(!prev) {
							prev_thread_id = id
						} else {
							prev_thread_id = prev.id
						}
						threadPage()
					})
				})
				
				var alternate = 0;
				function threadPage(){
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
									consolas: !!b.font,
									owner: false,
									id: b.id,
									type: 0,
									redir: JSON.stringify("/sf/" + b.subforum),
									joindate: 0,
									userid: b.user,
									alternate: alternate,
									online: !!online_users[b.user]
								}
							]
							alternate++
							if(b.user == userinfo.user_id){
								posts[0].owner = true
							}
							
							database.all("select * from threads where type=1 and parent=? and deleted = 0", [id], function(a,replies){
								for(i in replies){
									var owner = replies[i].user == userinfo.user_id
									posts.push({
										username: replies[i].user,
										title: replies[i].title,
										post_date: date_created(replies[i].date_created),
										body: escapeBody(replies[i].body),
										replyurl: "/reply/" + id,
										postcount: 0,
										consolas: !!replies[i].font,
										owner: owner,
										id: replies[i].id,
										type: 1,
										redir: "\"\"",
										joindate: 0,
										userid: replies[i].user,
										alternate: alternate,
										online: !!online_users[replies[i].user]
									})
									alternate++
									alternate %= 2
								}
								var usernames = [];
								var postcounts = [];
								var joindates = []
								var indx = 0;
								function getall(){
									database.get("select * from users where id=?", [posts[indx].username], function(a,usr){
										indx++;
										usernames.push(usr.username)
										postcounts.push(usr.posts)
										joindates.push(usr.date_joined)
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
										posts[i].joindate = joindate_label(joindates[i])
									}
									var output = tmp(Object.assign({
										subforum_name: sf.name,
										logged_in: userinfo.loggedin,
										thread_title: b.title,
										posts: posts,
										nextThread: next_thread_id,
										prevThread: prev_thread_id
									}, userinfo));
									
									res.write(output)
									res.end()
								}
							})
						})
					} else {
						module.exports(req, res, swig, database, b.parent, parseCookie, userinfo, date_created, querystring, online_users)
					}
				}
			}
		})
	}
	if(method == "delete"){
		database.get("select * from threads where id=? and deleted = 0", [id], function(a, b){
			if(!b){
				res.end()
				return
			}
			if(userinfo.user_id == b.user) {
				var subforum = b.subforum
				var userid = b.user
				database.run("update threads set deleted = 1 where id=?", [b.id], function(){
					if(b.type === 0){
						database.run("update subforums set post_count=post_count-1 where id=?", [subforum], function(){
							complete()
						})
					} else {
						complete()
					}
					
					function complete(){
						database.run("update users set posts=posts-1 where id=?",[userid], function(){
							res.end()
						})
					}
				})
			} else {
				res.end()
			}
		})
	}
	if(method == "post"){
		var queryData = "";
		var error = false;
		req.on('data', function(data) {
            queryData += data;
            if (queryData.length > 1000000) {
                queryData = "";
				res.end("")
                error = true
                req.connection.destroy();
            }
        });
		if(!error){
			req.on('end', function(){
				var data = querystring.parse(queryData)
				
				res.end("<html>" + JSON.stringify(data) + "<br>This feature is not yet implemented</html>")
			});
		}
	}
}