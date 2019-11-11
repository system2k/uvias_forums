module.exports.GET = async function(req, serve, vars, evars) {
    var swig = vars.swig;
    var db = vars.db;
    var userinfo = evars.userinfo;
    var postsPerPage = vars.postsPerPage;
    // logged in
    var tracked = []
    var tracked_threads = []
    
    var tracked = await db.all("select * from tracking where user=?", userinfo.user_id)
    
    for(var i = 0; i < tracked.length; i++) {
        var thread = await db.get("select * from threads where id=? and deleted = 0", tracked[i].thread)
        if(thread) {
            thread.read = false
            thread.mini_page_bar = false
            thread.mini_page_bar_pages = []
            thread.postedby = ""
            thread.replies = 0
            
            var user = await db.get("select username from users where id=?", thread.user)
            thread.postedby = user.username
            tracked_threads.push(thread)
            
            var cnt = await db.get("select count(*) as cnt from threads where thread=? and type=1", thread.id)
            thread.replies = cnt.cnt
            
            var totalPosts = cnt.cnt
            
            var totalPages = Math.ceil((totalPosts+1)/postsPerPage)
            if(totalPages > 1) {
                thread.mini_page_bar = true
                
                
                var pages = []

                if(totalPages <= 5) {
                    for(var i = 1; i <= totalPages; i++){
                        pages.push(i)
                    }
                } else {
                    pages.push(1,2,3)
                    var total = totalPages - 5;
                    if(total > 3) total = 3
                    pages.push("...")
                    for(var i = 0; i < total; i++){
                        pages.push((totalPages-total+1)+i)
                    }
                }

                thread.mini_page_bar_pages = pages;
            }
            
            var mrk = await db.get("select max_readAll_id as id from views where user=? and type=2 and forum_id=?", [userinfo.user_id, thread.forum])
            if(mrk){
                if(mrk.id >= thread.id) {
                    thread.read = true
                }
            }
            
            var view = await db.get("select * from views where user=? and type=0 and post_id=?", [userinfo.user_id, thread.id])
            if(view) {
                thread.read = true
            }
        }
    }
    
    var tmp = swig.compileFile("./frontend/templates/myforums.html")
    var output = tmp(Object.assign({
        tracking_total: tracked.length,
        tracked_threads: tracked_threads
    }, userinfo));
    serve(output)
}