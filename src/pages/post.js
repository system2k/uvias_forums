module.exports = async function(req, res, id, userinfo) {
	if(userinfo.logged_in == false){
		res.end("You need to be logged in")
		return
	}
	var method = req.method.toLowerCase()
	
	if(method == "get"){
		var tmp = swig.compileFile("./src/html/post.html")
		
		var b = await get("select * from forums where id=?", id)
		if(typeof a === "object" && a !== null || b === undefined) {
			res.write("Forum not found")
			res.end()
		} else {
			var f_g = await get("select * from forum_groups where id=?", b.forum_group)
			var output = tmp(Object.assign({
				forum_name: b.name,
				cancel_url: "/sf/" + id,
				f_g: f_g
			}, userinfo));
			res.write(output)
			res.end()
		}
	}
	if(method == "post") {
		if(userinfo.logged_in){
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
				req.on('end', async function(){
					var data = querystring.parse(queryData)
					if(data.command == "post_thread") {
						var args = querystring.parse(decodeURIComponent(data.arguments))
						var consolas = args.consolas;
						if(consolas == "false") {
							consolas = 0;
						} else if(consolas == "true") {
							consolas = 1
						} else {
							consolas = 0;
						}
						var cnt = await get("select count(*) as cnt from threads where forum=?", id)
						
						var ins_thread = await run("insert into threads values(null, ?, ?, ?, ?, ?, 0, null, (select count(*)+1 from threads), ?, ?, 0, 0)", [id, args.title, args.body, Date.now(), userinfo.user_id, consolas, parseInt(cnt.cnt)+1])
						
						var b = await get("select thread_count from forums where id=?", id)
						
						await run("update forums set thread_count=? where id=?", [parseInt(b.thread_count)+1, id])
						
						await run("update users set posts = posts + 1 where id=?", userinfo.user_id)
						
						await run("update forums set post_count=post_count+1 where id=?", id)
						res.writeHead(302, {
							"Location": "/thread/" + ins_thread.lastID
						})
						res.end()
					} else {
						res.end("Invalid command")
					}
				});
			}
		} else {
			res.end("You need to be logged in")
		}
	}
}