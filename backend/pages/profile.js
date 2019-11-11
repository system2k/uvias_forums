module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var urlSegmentIndex = vars.urlSegmentIndex;
    var date_created = vars.date_created;

    var tmp = swig.compileFile("./frontend/templates/profile.html")
    
    var id = urlSegmentIndex(req.url, 1);
    
    var b = await db.get("select * from users where id=?", id)
    if(!b) {
        return serve ("User does not exist")
    } else {
        var output = tmp(Object.assign({
            pf_username: b.username,
            posts: b.posts,
            joindate: date_created(b.date_joined),
            rank: b.rank,
            last_login: date_created(b.last_login),
            user: b
        }, userinfo));
        
        serve(output)
    }
}