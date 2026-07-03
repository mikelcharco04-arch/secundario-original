import { defineMcp } from "@lovable.dev/mcp-js";
import listKeys from "./tools/list-keys";
import generateKeys from "./tools/generate-keys";
import listActiveUsers from "./tools/list-active-users";
import setUserBlocked from "./tools/block-user";
import getStock from "./tools/stock";

export default defineMcp({
  name: "rave-auxiliar-mcp",
  title: "Rave Auxiliar MCP",
  version: "0.1.0",
  instructions:
    "Herramientas para administrar Rave Auxiliar: listar y generar proxy keys, ver usuarios activos, bloquear/desbloquear y consultar el stock.",
  tools: [listKeys, generateKeys, listActiveUsers, setUserBlocked, getStock],
});
