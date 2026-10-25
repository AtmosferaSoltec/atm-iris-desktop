import { BrowserWindow, ipcMain } from "electron";
import { contract, type ChannelName } from "@shared/ipc/contract";
import { dispatch, type IpcHandlers } from "./dispatch";

export function registerIpc(handlers: IpcHandlers): void {
  for (const name of Object.keys(contract) as ChannelName[]) {
    ipcMain.handle(contract[name].name, (event, input: unknown) => {
      const owner = BrowserWindow.fromWebContents(event.sender);
      const isTrustedSender =
        owner !== null &&
        !owner.isDestroyed() &&
        event.senderFrame !== null &&
        event.senderFrame === event.sender.mainFrame;
      return dispatch(name, input, isTrustedSender, handlers);
    });
  }
}
