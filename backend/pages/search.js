module.exports.GET = async function(req, serve, vars, evars, params) {
    var swig = vars.swig;
    var userinfo = evars.userinfo;
    var db = vars.db;

    if(!params) params = {};
    var prev_str = params.prev_str;
    var found = params.found;
	
	var tmp = swig.compileFile("./frontend/templates/search.html");
    
    if(!prev_str) prev_str = "";
    
    if(found) {
        for(var i = 0; i < found.length; i++) {
            var user = await db.get("select * from users where id=?", found[i].user)
            found[i].username = user.username
        }
    }
    
    var output = tmp(Object.assign({
        found: found,
        prev_str: prev_str
    }, userinfo));
    serve(output)
}

module.exports.POST = async function(req, serve, vars, evars) {
    var db = vars.db;
    var data = evars.pdata;
    var querystring = vars.querystring;

    console.log(data)
    if(data.command == "search") {
        var args = querystring.parse(decodeURIComponent(data.arguments))
        if(args.search) {
            var src = args.search
            src = src.split(" ")
            
            
            var results = []
            var idx = 1;
            var alt = 0
            
            var searchData = await db.all("select * from threads");
            for(var i = 0; i < searchData.length; i++) {
                var tdata = searchData[i];

                var _title = tdata.title.toUpperCase()
                var _body = tdata.body.toUpperCase()
                
                var fnd = false
                
                for(var s = 0; s < src.length; s++){
                    if(src[s]) {
                        src[s] = src[s].toUpperCase()
                        
                        if(_title.indexOf(src[s]) !== -1) fnd = true
                        if(_body.indexOf(src[s]) !== -1) fnd = true
                        if(fnd) break
                    }
                }
                
                if(fnd) {
                    tdata.index = idx
                    idx++
                    if(alt === 0) tdata.backgroundcol = "cee7ff"
                    if(alt === 1) tdata.backgroundcol = "ffffff"
                    alt++
                    alt %= 2
                    if(tdata.body.length > 300) {
                        tdata.body = tdata.body.slice(0,300) + "..."
                    }
                    results.push(tdata)
                }
            }
            
            return await module.exports.GET(req, serve, vars, evars, {
                found: results,
                prev_str: args.ssearch
            });
        }
    }
    return serve();
}