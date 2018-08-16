module.exports = function(req, res, userinfo){
	var tmp = swig.compileFile("./src/html/admin_editannouncement.html")
	
	var output = tmp(Object.assign({
	}, userinfo));
	res.write(output)
	res.end()
}