module.exports = function(req, res, userinfo, id) {
	var tmp = swig.compileFile("./src/html/forum_group.html")
	
	var forum_group;
	database.get("select * from forum_groups where id=?", id, function(e, f_g){
		if(f_g){
			forum_group = f_g
			done()
		} else {
			res.end("Invalid forum group id.")
		}
	})
	
	function done(){
		database.all("select * from forums where forum_group=? order by _order", id, function(a, b){
			var output = tmp(Object.assign({
				forums: b,
				forum_group: forum_group
			}, userinfo));
			
			res.write(output)
			res.end()
		})
	}
}