module.exports = async function(req, res, userinfo){
	var tmp = swig.compileFile("./src/html/admin_editforums.html")
	
	var forum_groups = []
	
	var f_g = await all("select * from forum_groups order by _order")
	var indx = 0
	async function step(){
		var forums = await all("select * from forums where forum_group = ? order by _order", f_g[indx].id)
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
	}
	if(f_g.length > 0){
		step()
	} else {
		done()
	}
	
	function done(){
		var output = tmp(Object.assign({
			forum_groups: forum_groups
		}, userinfo));
		res.write(output)
		res.end()
	}
}