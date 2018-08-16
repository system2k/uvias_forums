module.exports = function(req, res, userinfo){
	var method = req.method.toLowerCase()
	
	if(method == "get"){
		var tmp = swig.compileFile("./src/html/admin.html")
		
		database.all("select * from forums", function(a,b){
			var forums = []
			for(i in b){
				forums.push({
					id: b[i].id,
					name: b[i].name,
					desc: b[i].desc,
					date_created: date_created(b[i].date_created),
					thread_count: b[i].thread_count,
					post_count: b[i].post_count,
					_order: b[i]._order
				})
			}
			var output = tmp(Object.assign({
				forums: forums,
				forum_count: forums.length
			}, userinfo));
			res.write(output)
			res.end()
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
				if(data.newforums){
					var sfs = JSON.parse(data.newforums)
					
					var i = 0;
					function step(){
						database.get("SELECT COUNT(*) AS cnt FROM forums", function(a,b){
							database.run("INSERT INTO forums VALUES (null, ?, ?, ?, 0, 0, ?, 1)", [sfs[i][0], sfs[i][1], Date.now(), parseInt(b.cnt)+1], function(){
								i++;
								if(sfs.length > i){
									step()
								} else {
									res.end()
								}
							})
						})
					}
					if(sfs.length == 0){
						res.end()
					} else {
						step()
					}
				} else if(data.editedsfs) {
					var edits = JSON.parse(data.editedsfs)
					
					var i = 0;
					function step(){
						database.run("UPDATE forums SET name=?, desc=?,_order=? WHERE id=?", [edits[i][1], edits[i][2], edits[i][3], edits[i][0]], function(){
							i++;
							if(edits.length > i){
								step()
							} else {
								res.end()
							}
						})
					}
					if(edits.length == 0){
						res.end()
					} else {
						step()
					}
				} else if(data.command) {
					var args = querystring.parse(decodeURIComponent(data.arguments))
					if(data.command == "update_announcement") {
						var chg = args.changes
						cache_data.announcement = chg
						database.run("UPDATE info SET data=? WHERE name='announcement'", [chg], function(){
							res.writeHead(302, {
								"Location": "/admin/editannouncement"
							})
							res.end()
						})
						
					} else if(data.command == "create_forum") {
						var name = args.name
						var desc = args.desc
						var forum_group = args.forum_group
						
						database.run("insert into forums values(null, ?, ?, ?, ?, ?, (SELECT (CASE WHEN EXISTS(SELECT id from forums where forum_group=? limit 1) THEN (select _order from forums where forum_group=? order by _order desc limit 1) ELSE 0 END)+1 as ord), ?)", [name, desc, Date.now(), 0, 0, forum_group, forum_group, forum_group], function(a,b){
							res.writeHead(302, {
								"Location": "/"
							})
							res.end()
						})
						
					} else if(data.command == "update_forum_group") {
						var name = args.name
						var id = args.id
						database.get("select * from forum_groups where id=?", id, function(e,f_g){
							if(f_g){
								database.run("update forum_groups set name=? where id=?", [name, id], function(){
									res.writeHead(302, {
										"Location": req.headers.referer
									})
									res.end()
								})
							} else {
								res.end("")
							}
						})
						
					} else if(data.command == "create_forum_group") {
						var name = args.name
						database.run("insert into forum_groups values(null, ?, ?, (select _order+1 from forum_groups order by _order desc limit 1))", [name, Date.now()], function(){
							res.writeHead(302, {
								"Location": "/"
							})
							res.end()
						})
						
					} else if(data.command == "update_forum") {
						var name = args.name
						var desc = args.desc
						var id = args.id
						var forum_group = args.forum_group
						database.run("update forums set name=?, desc=?, forum_group=?, _order=(SELECT (CASE WHEN EXISTS(SELECT id from forums where forum_group=? limit 1) THEN (select _order from forums where forum_group=? order by _order desc limit 1) ELSE 0 END)+1 as ord) where id=?", [name, desc, forum_group, forum_group, forum_group, id], function(){
							res.writeHead(302, {
								"Location": "/admin/editforums"
							})
							res.end()
						})
						
					} else if(data.command == "delete_forum") {
						var id = args.id
						database.run("delete from forums where id=?", id, function(){
							res.writeHead(302, {
								"Location": "/admin/editforums"
							})
							res.end()
						})
					
					} else {
						res.end()
					}
				} else {
					res.end()
				}
			});
		}
	}
}