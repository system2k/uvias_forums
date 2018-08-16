module.exports = function(req, res, userinfo){
	if(userinfo.logged_in) {
		var tmp = swig.compileFile("./src/html/inbox.html")
		
		var messages = []
		
		/*
			views types:
			0: Post views
			1: Forum views
			2: Range of threads marked as read in forums
			3: Inbox messages viewed
		*/
		
		database.all("select * from messages where to_id=? order by id desc", userinfo.user_id, function(e, msgs){
			for(i in msgs){
				msgs[i].date = date_created(msgs[i].date)
				msgs[i].read = false;
				messages.push(msgs[i])
			}
			part2()
		})
		
		function part2() {
			var indx = 0
			function step(){
				database.get("select * from users where id=?", messages[indx].from_id, function(e, u_id){
					messages[indx].username = u_id.username
					
					database.get("select * from views where message_id = ? and type = 3", messages[indx].id, function(e, view){
						if(view) {
							messages[indx].read = true
							dn_s1()
						} else {
							dn_s1()
						}
					})
					
					function dn_s1(){
						indx++
						if(indx >= messages.length) {
							done()
						} else {
							step()
						}
					}
				}) 
			}
			if(messages.length > 0) {
				step()
			} else {
				done()
			}
		}
		
		function done(){
			var output = tmp(Object.assign({
				username: userinfo.username,
				messages: messages
			}, userinfo));
			res.write(output)
			res.end()
		}
	} else {
		res.end()
	}
}