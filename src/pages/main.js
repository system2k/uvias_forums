module.exports = function(req, res, swig, database, parseCookie, userinfo) {
	var tmp = swig.compileFile("./src/html/main.html")
	
	var forum_groups = []
	
	database.all("select * from forum_groups order by _order", function(e, f_g){
		var indx = 0
		function step(){
			database.all("select * from forums where forum_group = ? order by _order", [f_g[indx].id], function(er, forums){
				forum_groups.push({
					id: f_g[indx].id,
					name: f_g[indx].name,
					forums: forums
				})
				
				indx++
				if(indx >= f_g.length) {
					done()
				} else {
					step()
				}
			})
		}
		if(f_g.length > 0){
			step()
		} else {
			done()
		}
	})
	
	
	
	//var forums = [];
	function done(){
		database.all("select * from forums order by _order", function(a, b){
			/*for(i in b){
				forums.push(b[i])
			}*/
			var output = tmp(Object.assign({
				//forums: forums,
				forum_groups: forum_groups,
				logged_in: userinfo.loggedin
			}, userinfo));
			
			res.write(output)
			res.end()
		})
	}
}