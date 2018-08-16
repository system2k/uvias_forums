module.exports = function(req, res, swig, database, id) {
	var tmp = swig.compileFile("./src/html/sf.html")
	
	database.get("select name from subforums where id=?", [id], function(a, b){
		if(typeof a === "object" && a !== null || b === undefined) {
			res.write("Subforum not found")
			res.end()
		} else {
			var sfName = b.name;
			database.all("select * from threads where subforum=?", [id], function(a, b){
				var threads = [];
				for(i in b){
					threads.push({
						id: b[i].id,
						title: b[i].title,
						postedby: "postedby" + b[i].user
					})
				}
				var output = tmp({
					subforum_id: id,
					subforum_name: sfName,
					threads: threads
				});
				
				res.write(output)
				res.end()
			})
		}
	})
}