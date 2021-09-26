
#include <iostream>

#include "mongoose.h"

static inline std::string mg_to_std_str(const mg_str& str) {
    return std::string(str.ptr, str.len);
}

static inline std::string mg_to_std_str(const mg_str* str) {
    return std::string(str->ptr, str->len);
}

static void serve_http(mg_connection *c, mg_http_message* message) {
  struct mg_http_serve_opts opts = {.root_dir = "./www"};   // Serve local dir
  auto url = mg_to_std_str(message->uri);
  auto query = mg_to_std_str(message->query);
  std::cout << "URL:" << url << std::endl;
  std::cout << "Query:" << query << std::endl;
  std::cout << "Body:" << mg_to_std_str(message->body) << std::endl;
  std::cout << "Message:" << mg_to_std_str(message->message) << std::endl;
  std::cout << "Method:" << mg_to_std_str(message->method) << std::endl;
  std::cout << "Chunk:" << mg_to_std_str(message->chunk) << std::endl;
  mg_http_serve_dir(c, message, &opts);
}

static void fn(struct mg_connection *c, int ev, void *ev_data, void *fn_data) {
  if (ev == MG_EV_HTTP_MSG) serve_http(c, (mg_http_message*)ev_data);
}

int main(int argc, char *argv[]) {
  struct mg_mgr mgr;
  mg_mgr_init(&mgr);                                        // Init manager
  mg_http_listen(&mgr, "http://localhost:8000", fn, &mgr);  // Setup listener
  for (;;) mg_mgr_poll(&mgr, 1000);                         // Event loop
  mg_mgr_free(&mgr);                                        // Cleanup
  return 0;
}
