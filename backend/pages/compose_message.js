module.exports.GET = async function(req, serve, vars) {
    if(userinfo.logged_in) {
		var method = req.method.toLowerCase()
		
		if(method === "get") {
			var tmp = swig.compileFile("./src/html/compose_message.html")
			
			var to_user;
			
			var user = await get("select * from users where id=?", id)
			if(user) {
				to_user = user
				done()
			} else {
				res.end()
			}
			
			function done(){
				var output = tmp(Object.assign({
					username: userinfo.username,
					to_user: to_user
				}, userinfo));
				res.write(output)
				res.end()
			}
		} else if(method === "post") {
			var queryData = "";
			req.on('data', function(data) {
				queryData += data;
				if (queryData.length > 1000000) {
					queryData = "";
					res.end("")
					req.connection.destroy();
				}
			});
			req.on('end', async function(){
				var data = querystring.parse(queryData)
				if(data.command == "send_message") {
					var args = querystring.parse(decodeURIComponent(data.arguments))
					var id = args.id
					var subject = args.subject
					var body = args.body
					
					var user = await get("select * from users where id=?", id)
					if(user) {
						await run("insert into messages values(null, ?, ?, ?, ?, ?)", [Date.now(), userinfo.user_id, id, subject, body])
						res.writeHead(302, {
							"Location": "/profile/" + id
						})
						res.end()
					} else {
						res.end()
					}
				} else {
					res.end("Invalid command")
				}
			});
		} else {
			res.end()
		}
	} else {
		res.end()
	}
}

module.exports.POST = async function(req, serve, vars) {
    
}