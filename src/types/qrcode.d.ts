declare module 'qrcode' {
  interface QRCodeToDataUrlOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  const QRCode: {
    toDataURL(text: string, options?: QRCodeToDataUrlOptions): Promise<string>;
  };

  export default QRCode;
}
