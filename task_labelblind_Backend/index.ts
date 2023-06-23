import puppeteer from 'puppeteer';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { config } from 'dotenv';

config();

const url = 'https://books.toscrape.com/';

interface BookData {
  title: string;
  price: number;
  imgSrc: string;
  rating: number;
}

const main = async (): Promise<void> => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url);

  const bookData: BookData[] = await page.evaluate((url: string) => {
    const convertPrice = (price: string): number => {
      return parseFloat(price.replace('€', ''));
    };

    const convertRating = (rating: string): number => {
      switch (rating) {
        case 'One':
          return 1;
        case 'Two':
          return 2;
        case 'Three':
          return 3;
        case 'Four':
          return 4;
        case 'Five':
          return 5;
        default:
          return 0;
      }
    };

    const bookPods = Array.from(document.querySelectorAll('.product_pod'));
    const data: BookData[] = bookPods.map((book) => ({
      title: book.querySelector('h3 a')!.getAttribute('title')!,
      price: convertPrice(book.querySelector('.price_color')!.textContent!),
      imgSrc: url + book.querySelector('img')!.getAttribute('src')!,
      rating: convertRating(book.querySelector('.star-rating')!.classList[1]),
    }));

    return data;
  }, url);
  console.log(bookData);

  await browser.close();

  const uri = process.env.MONGODB_URI!;
  const dbName = process.env.DB_NAME!;
  const collectionName = process.env.COLLECTION_NAME!;

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true } as MongoClientOptions);
  await client.connect();

  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  const result = await collection.insertMany(bookData);
  if (result.insertedCount > 0) {
    console.log(`${result.insertedCount} documents inserted into MongoDB`);
  } else {
    console.log('No documents were inserted');
  }

  client.close();
};

main();
