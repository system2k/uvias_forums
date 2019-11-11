module.exports.GET = async function(req, serve, vars, evars) {
    var url = vars.url;
    var static_data = vars.static_data;

    var path = url.parse(req.url).pathname.substr(1);
    var data = static_data[path];
    if(data) {
        serve(data);
    } else {
        serve("404");
    }
}