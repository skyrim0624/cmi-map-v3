declare module 'qrcode' {
  interface QRCodeToDataUrlOptions {
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  const QRCode: {
    toDataURL(text: string, options?: QRCodeToDataUrlOptions): Promise<string>;
  };

  export default QRCode;
}
