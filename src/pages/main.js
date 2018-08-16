module.exports = function(req, res, swig, database) {
	var tmp = swig.compileFile("./src/html/main.html")
	
	var subforums = [];
	
	database.all("select * from subforums", function(a, b){
		for(i in b){
			subforums.push(b[i])
		}
		var output = tmp({
			subforums: subforums
		});
		
		res.write(output)
		res.end()
	})
}