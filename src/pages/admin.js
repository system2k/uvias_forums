module.exports = function(req, res, swig, userinfo, database, date_created, querystring){
	var method = req.method.toLowerCase()
	
	if(method == "get"){
		var tmp = swig.compileFile("./src/html/admin.html")
		
		database.all("select * from subforums", function(a,b){
			var subforums = []
			for(i in b){
				subforums.push({
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
				logged_in: userinfo.loggedin,
				subforums: subforums,
				subforum_count: subforums.length
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
				if(data.newsubforums){
					var sfs = JSON.parse(data.newsubforums)
					
					var i = 0;
					function step(){
						database.get("SELECT COUNT(*) AS cnt FROM subforums", function(a,b){
							database.run("INSERT INTO subforums VALUES (null, ?, ?, ?, 0, 0, ?)", [sfs[i][0], sfs[i][1], Date.now(), parseInt(b.cnt)+1], function(){
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
						database.run("UPDATE subforums SET name=?, desc=?,_order=? WHERE id=?", [edits[i][1], edits[i][2], edits[i][3], edits[i][0]], function(){
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
				} else {
					res.end()
				}
			});
		}
	}
}