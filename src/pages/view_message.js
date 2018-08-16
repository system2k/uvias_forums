module.exports = function(req, res, userinfo, id){
	if(userinfo.logged_in) {
		database.get("select * from messages where id=?", id, function(e, message){
			if(message){
				if(message.to_id == userinfo.user_id) {
					var tmp = swig.compileFile("./src/html/view_message.html")
					
					var from_user;
					
					database.get("select * from users where id=?", message.from_id, function(e, u){
						
						database.get("select * from views where message_id=? and type = 3", message.id, function(e, view){
							if(view) {
								d_s1()
							} else {
								database.run("insert into views values(?, ?, 3, null, null, null, ?)", [userinfo.user_id, Date.now(), message.id], function(){
									d_s1()
								})
							}
						})
						
						function d_s1(){
							from_user = u
							done()
						}
					})
					
					function done(){
						var output = tmp(Object.assign({
							username: userinfo.username,
							from_user: from_user,
							subject: message.subject,
							body: message.body
						}, userinfo));
						res.write(output)
						res.end()
					}
				} else {
					res.end("You do not have permission")
				}
			} else {
				res.end()
			}
		})
	} else {
		res.end()
	}
}