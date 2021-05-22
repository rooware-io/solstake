import React from "react";

export function notify({
  message = "",
  description = undefined as any,
  txid = "",
  type = "info",
  placement = "bottomLeft",
}) {
  console.log(`Message: ${message}, description: ${description}, txid: ${txid}, type: ${type}`);
}
