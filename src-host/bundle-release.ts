
import { decode } from './base64';
import dataBase64 from '../build/release/release';

const data: ArrayBuffer | Promise<ArrayBuffer> = decode(dataBase64);

export default data;
