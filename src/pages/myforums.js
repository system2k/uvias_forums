module.exports = function(req, res, userinfo) {
	if(userinfo.logged_in){
		var tracked = []
		var tracked_threads = []
		
		database.all("select * from tracking where user=?", userinfo.user_id, function(e, tracking){
			tracked = tracking
			
			var indx = 0
			function step(){
				database.get("select * from threads where id=? and deleted = 0", tracked[indx].thread, function(e, thread){
					if(thread){
						thread.read = false
						thread.mini_page_bar = false
						thread.mini_page_bar_pages = []
						thread.postedby = ""
						thread.replies = 0
						
						database.get("select username from users where id=?", thread.user, function(e, user){
							thread.postedby = user.username
							tracked_threads.push(thread)
							
							database.get("select count(*) as cnt from threads where thread=? and type=1", thread.id, function(e, cnt){
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
								
								
								
								database.get("select max_readAll_id as id from views where user=? and type=2 and forum_id=?", [userinfo.user_id, thread.forum], function(e, mrk){
									if(mrk){
										if(mrk.id >= thread.id) {
											thread.read = true
										}
									}
									
									database.get("select * from views where user=? and type=0 and post_id=?", [userinfo.user_id, thread.id], function(e, view){
										if(view) {
											thread.read = true
										}
										next()
									})
								})
							})
						})
					} else {
						next()
					}
					
					function next(){
						indx++
						if(indx >= tracked.length) {
							complete()
						} else {
							step()
						}
					}
				})
			}
			if(tracked.length > 0) {
				step()
			} else {
				complete()
			}
			
		})
		
		function complete(){
			
			var tmp = swig.compileFile("./src/html/myforums.html")
			var output = tmp(Object.assign({
				tracking_total: tracked.length,
				tracked_threads: tracked_threads
			}, userinfo));
			res.write(output)
			res.end()
		}
	} else {
		res.end()
	}
}