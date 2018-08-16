module.exports = function(req, res, swig, userinfo, database, date_created, querystring, cache_data){
	var tmp = swig.compileFile("./src/html/admin_editannouncement.html")
	
	var output = tmp(Object.assign({
		logged_in: userinfo.loggedin
	}, userinfo));
	res.write(output)
	res.end()
}