import Clipboard from "@react-native-clipboard/clipboard";

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    Clipboard.setString(text);
    return true;
  } catch {
    return false;
  }
}
