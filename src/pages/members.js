module.exports = async function(req, res, userinfo, results, last_search){
	var method = req.method.toLowerCase()
	
	if(method === "get") {
		var tmp = swig.compileFile("./src/html/members.html")
		
		var users = {};
		
		if(!results) {
			var usrs = await all("select * from users")
		} else {
			var usrs = results
		}
		for(i in usrs){
			users[i] = usrs[i]
			users[i].date_joined = joindate_label(users[i].date_joined)
			users[i].last_login = joindate_label(users[i].last_login)
		}
		
		if(!last_search) last_search = ""
		var output = tmp(Object.assign({
			users: users,
			letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
			last_search: last_search
		}, userinfo));
		res.write(output)
		res.end()
	}
	if(method === "post") {
		var queryData = "";
		req.on('data', function(data) {
            queryData += data;
            if (queryData.length > 1000000) {
                queryData = "";
				res.end("")
                req.connection.destroy();
            }
        });
		req.on('end', function(){$(async function(){
			var data = querystring.parse(queryData)
			if(data.command == "search"){
				var args = querystring.parse(decodeURIComponent(data.arguments))
				if(args.search !== undefined) {
					var src = args.search.toUpperCase()
					
					var results = []
					
					await each("select * from users", function(e, data) {
						var username = data.username.toUpperCase()
						
						if(username.indexOf(src) > -1) {
							results.push(data)
						}
					})
					
					module.exports({method: "GET"}, res, userinfo, results, args.search)
				} else {
					res.end()
				}
			} else {
				res.end()
			}
		})});
	}
}