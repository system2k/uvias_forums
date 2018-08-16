module.exports = function(req, res, userinfo){
	var tmp = swig.compileFile("./src/html/admin_editforums.html")
	
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
	
	function done(){
		database.all("select * from forums", function(a,b){
			/*var forums = []
			for(i in b){
				forums.push({
					id: b[i].id,
					name: b[i].name,
					desc: b[i].desc,
					date_created: date_created(b[i].date_created),
					thread_count: b[i].thread_count,
					post_count: b[i].post_count,
					_order: b[i]._order
				})
			}*/
			var output = tmp(Object.assign({
				/*forums: forums,
				forum_count: forums.length*/
				forum_groups: forum_groups
			}, userinfo));
			res.write(output)
			res.end()
		})
	}
}