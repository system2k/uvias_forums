module.exports = function(req, res, userinfo){
	if(userinfo.logged_in) {
		var tmp = swig.compileFile("./src/html/inbox.html")
		
		var messages = []
		
		database.all("select * from messages where to_id=? order by id desc", userinfo.user_id, function(e, msgs){
			for(i in msgs){
				msgs[i].date = date_created(msgs[i].date)
				messages.push(msgs[i])
			}
			part2()
		})
		
		function part2() {
			var indx = 0
			function step(){
				database.get("select * from users where id=?", messages[indx].from_id, function(e, u_id){
					messages[indx].username = u_id.username
					
					indx++
					if(indx >= messages.length) {
						done()
					} else {
						step()
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