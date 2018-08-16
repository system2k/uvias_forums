module.exports = function(req, res, swig, querystring, database, encryptHash, crypto, url) {
	var method = req.method.toLowerCase()
	
	if(method == "get") {
		var searchquery = querystring.parse(url.parse(req.url).query)
		
		var tmp = swig.compileFile("./src/html/register.html")
		
		var errLabel = ""
		if(searchquery.e == "1"){
			errLabel = "There already exists an account with the same username";
		}
		
		var output = tmp({
			err_label: errLabel
		});
		
		res.write(output)
		res.end()
	}
	if(method == "post") {
		var queryData = "";
		var error = false;
		req.on('data', function(data) {
            queryData += data;
            if (queryData.length > 2000) {
                queryData = "";
				res.end("")
                error = true
                req.connection.destroy();
            }
        });
		if(!error){
			req.on('end', function(){
				var data = querystring.parse(queryData)
				
				var user = data.user
				var pass = data.pass
				
				database.get("select username from users where username=? collate nocase", [user], function(a, b){
					if(b === undefined) {
						database.run("insert into users values(null, ?, ?, ?, 0)", [user, encryptHash(pass), Date.now()], function(a, b){
							res.writeHead(302, {
								"Location": "/"
							})
							res.end()
						})
					} else {
						res.writeHead(302, {
							"Location": "/register?e=1"
						})
						res.end()
					}
				})
			});
		}
	}
}