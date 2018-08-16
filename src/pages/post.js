module.exports = function(req, res, swig, database, querystring, id) {
	var method = req.method.toLowerCase()
	
	if(method == "get"){
		var tmp = swig.compileFile("./src/html/post.html")
		
		database.get("select * from subforums where id=?", [id], function(a, b){
			if(typeof a === "object" && a !== null || b === undefined) {
				res.write("Subforum not found")
				res.end()
			} else {
				var output = tmp({
					subforum_name: b.name
				});
				res.write(output)
				res.end()
			}
		})
	}
	if(method == "post") {
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
				
				database.run("insert into threads values(null, ?, ?, ?, ?, ?, 0)", [id, data.title, data.body, Date.now(), 0], function(a,b) {
					database.get("select post_count from subforums where id=?", [id], function(a,b){
						database.run("update subforums set post_count=? where id=?", [parseInt(b.post_count)+1, id], function(a,b){
							res.write("thread/" + this.lastID)
							res.end()
						})
					})
				})
			});
		}
	}
}