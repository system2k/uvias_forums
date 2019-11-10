module.exports.GET = async function(req, serve, vars) {
    var tmp = swig.compileFile("./src/html/admin_createforumgroup.html")
	
	var output = tmp(userinfo);
	res.write(output)
	res.end()
}

module.exports.POST = async function(req, serve, vars) {
    
}