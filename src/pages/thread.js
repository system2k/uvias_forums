module.exports = function(req, res, swig, database, id) {
	var tmp = swig.compileFile("./src/html/thread.html")
	
	
	database.get("select * from threads where id=?", [id], function(a, b){
		if(typeof a === "object" && a !== null || b === undefined) {
			res.write("Thread not found")
			res.end()
		} else {
			database.get("select name from subforums where id=?", [b.subforum], function(err, sf){
				var output = tmp({
					subforum_name: sf.name,
					thread_title: b.title,
					op_username: "postedby" + b.user,
					thread_body: b.body
				});
				
				res.write(output)
				res.end()
			})
		}
	})
}