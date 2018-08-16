module.exports = function(req, res, userinfo, found, prev_str){
	var method = req.method.toLowerCase()
	
	if(method === "get") {
		var tmp = swig.compileFile("./src/html/search.html")
		
		if(!prev_str) prev_str = ""
		
		if(found) {
			var indx = 0
			function step(){
				database.get("select * from users where id=?", found[indx].user, function(e, user){
					found[indx].username = user.username
					
					indx++
					if(indx >= found.length) {
						done()
					} else {
						step()
					}
				})
			}
			if(found.length > 0) {
				step()
			} else {
				done()
			}
		} else {
			done()
		}
		
		function done(){
			var output = tmp(Object.assign({
				found: found,
				prev_str: prev_str
			}, userinfo));
			res.write(output)
			res.end()
		}
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
		req.on('end', function(){
			var data = querystring.parse(queryData)
			if(data.command == "search"){
				var args = querystring.parse(decodeURIComponent(data.arguments))
				if(args.search) {
					var src = args.search
					src = src.split(" ")
					
					
					var results = []
					var idx = 1;
					var alt = 0
					database.each("select * from threads", function(e, data){
						var _title = data.title.toUpperCase()
						var _body = data.body.toUpperCase()
						
						var fnd = false
						
						for(var i = 0; i < src.length; i++){
							if(src[i]) {
								src[i] = src[i].toUpperCase()
								
								if(_title.indexOf(src[i]) !== -1) fnd = true
								if(_body.indexOf(src[i]) !== -1) fnd = true
								if(fnd) break
							}
						}
						
						if(fnd) {
							data.index = idx
							idx++
							if(alt === 0) data.backgroundcol = "cee7ff"
							if(alt === 1) data.backgroundcol = "ffffff"
							alt++
							alt %= 2
							if(data.body.length > 300) {
								data.body = data.body.slice(0,300) + "..."
							}
							results.push(data)
						}
						
					}, function(e, t){
						module.exports({method: "GET"}, res, userinfo, results, args.search)
					})
				} else {
					res.end()
				}
			} else {
				res.end()
			}
		});
	}
}