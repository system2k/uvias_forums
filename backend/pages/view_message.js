module.exports.GET = async function(req, serve, vars) {
    if(userinfo.logged_in) {
		var message = await get("select * from messages where id=?", id)
		if(message){
			if(message.to_id == userinfo.user_id) {
				var tmp = swig.compileFile("./src/html/view_message.html")
				
				var from_user;
				
				var u = await get("select * from users where id=?", message.from_id)
				var view = await get("select * from views where message_id=? and type = 3", message.id)
				if(view) {
					d_s1()
				} else {
					await run("insert into views values(?, ?, 3, null, null, null, ?)", [userinfo.user_id, Date.now(), message.id])
					d_s1()
				}
				
				function d_s1(){
					from_user = u
					done()
				}
				
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
	} else {
		res.end()
	}
}

module.exports.POST = async function(req, serve, vars) {
    
}