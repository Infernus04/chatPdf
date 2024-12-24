import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {Document , RecursiveCharacterTextSplitter} from "@pinecone-database/doc-splitter"
import { getEmbeddings } from "./embeddings";
import md5 from "md5";
import { convertToAscii } from "./utils";
 
export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent : string;
  metadata : {
    loc : {pageNumber : number}
  }
}

export async function loadS3intoPinecone(fileKey: string) {
  //obtain the PDF -> download and read from pdf
  console.log("Downloading s3 into file system");
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("Could not download from s3");
  }
  console.log("loading pdf into memory" + file_name);
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load())as PDFPage[];
  
  //split and segment the pdf into pages
  //pages = Array(13)
  const documents = await Promise.all(pages.map(prepareDocument))

  //Vectorise and embed individual documents
  const vectors = await Promise.all(documents.flat().map(embedDocument));

  //upload to pinecone
  const client =  getPineconeClient();
  const pineconeIndex =  client.index("chatpdf");
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));


  console.log("inserting vectors to pinecone");
  await namespace.upsert(vectors);
  return documents[0];


}

async function embedDocument(doc : Document){
  try {
    const embeddings = await getEmbeddings(doc.pageContent)
    const hash = md5(doc.pageContent);

    return{
      id : hash,
      values : embeddings,
      metadata : {
        text : doc.metadata.text,
        pageNumber : doc.metadata.pageNumber,
      },
    } as PineconeRecord
    
  } catch (error) {
    console.log("Error embedding the document",error)
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number): string => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};



async function prepareDocument(page : PDFPage){
  let {pageContent , metadata} = page;
  pageContent = pageContent.replace(/\n/g,"")
  //split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata : {
        pageNumber : metadata.loc.pageNumber,
        text : truncateStringByBytes(pageContent,36000)
       },
    }),
  ]);

  return docs;

}