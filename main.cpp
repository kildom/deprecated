
#include <iostream>
#include <string>

#include "mongoose/mongoose.h"
#include "cJSON/cJSON.h"

static inline std::string mg_to_std_str(const mg_str& str) {
    return std::string(str.ptr, str.len);
}

static inline std::string mg_to_std_str(const mg_str* str) {
    return std::string(str->ptr, str->len);
}

static cJSON* executeCmd(cJSON* input)
{
  cJSON* idValue = cJSON_GetObjectItemCaseSensitive(input, "id");
  if (!idValue || !cJSON_IsString(idValue)) throw "Invalid request";
  const char* id = cJSON_GetStringValue(idValue);
  if (strcmp(id, ""))
}

static void serve_http(mg_connection *c, mg_http_message* message) {
  if (mg_to_std_str(message->uri) == "/msg") {
    cJSON* input = nullptr;
    cJSON* output = nullptr;
    char* rsp = nullptr;
    try {
      input = cJSON_ParseWithLength(message->body.ptr, message->body.len);
      if (!input) throw "Invalid input JSON";
      output = executeCmd(input);
      cJSON_Delete(input);
      input = nullptr;
      rsp = cJSON_Print(output);
      if (!rsp) throw "Out of memory";
      cJSON_Delete(output);
      output = nullptr;
      mg_http_reply(c, 200, NULL, "%s", rsp);
      cJSON_free(rsp);
    } catch (const char* exception) {
      cJSON_Delete(input);
      cJSON_Delete(output);
      if (rsp != nullptr)
        cJSON_free(rsp);
      std::cerr << exception << std::endl;
      mg_http_reply(c, 200, NULL, "{\"error\":\"%s\"}", rsp);
    }
    // TODO: error handling
  } else {
    struct mg_http_serve_opts opts = {.root_dir = "./www"};
    mg_http_serve_dir(c, message, &opts);
  }
  auto url = mg_to_std_str(message->uri);
  auto query = mg_to_std_str(message->query);
  std::cout << "URL:" << url << std::endl;
  std::cout << "Query:" << query << std::endl;
  std::cout << "Body:" << mg_to_std_str(message->body) << std::endl;
  std::cout << "Message:" << mg_to_std_str(message->message) << std::endl;
  std::cout << "Method:" << mg_to_std_str(message->method) << std::endl;
  std::cout << "Chunk:" << mg_to_std_str(message->chunk) << std::endl;
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
