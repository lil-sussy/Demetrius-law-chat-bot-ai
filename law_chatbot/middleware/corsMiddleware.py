class corsMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response["Access-Control-Allow-Origin"] = "localhost:3000"
        response["Access-Control-Allow-Credentials"] = "true"
        response["xd"] = "xd"
        response["Access-Control-Allow-Methods"] = "GET,HEAD,OPTIONS,POST,PUT"
        response["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, X-Token",
        return response