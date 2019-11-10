module.exports.GET = async function(req, serve, vars) {
    var tmp = swig.compileFile("./src/html/admin_editannouncement.html")
	
	var output = tmp(Object.assign({
	}, userinfo));
	res.write(output)
	res.end()
}

module.exports.POST = async function(req, serve, vars) {
    
}