module.exports = function(req, res, userinfo){
	var tmp = swig.compileFile("./src/html/admin_createforumgroup.html")
	
	var output = tmp(userinfo);
	res.write(output)
	res.end()
}