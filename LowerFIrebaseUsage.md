Lowering Firebase usage and costs requires
optimizing database reads/writes, minimizing network traffic, caching data, and implementing strict monitoring. The most critical areas for cost optimization are Cloud Firestore and Cloud Functions, as unexpected usage spikes can lead to high bills. 
Here are the top tips and tricks to reduce Firebase usage and costs:
1. Optimize Firestore Reads (Most Common Expense) 

    Use Local Caching: Enable Firestore's local persistence to cache data on the client device. This prevents fetching the same data from the server multiple times.
    Use get() Instead of onSnapshot(): Avoid real-time listeners (onSnapshot) for data that does not change frequently. Use get() to fetch data only once when needed.
    Implement Pagination: Never fetch an entire collection. Use limit() and startAfter() to load data in chunks as the user scrolls.
    Denormalize Data: Structure your data to read exactly what is needed in one go. Instead of fetching a document and then fetching related sub-documents, combine necessary data into a single document.
    Use Data Bundles: For static or rarely changing data, use Firestore Bundles to serve data via CDN, reducing database read costs.
    Cache in Memory: For frequently accessed user profile data, store it in the client-side app memory (e.g., Redux, Provider) rather than hitting the database every time a screen opens. 

2. Optimize Firestore Writes

    Use Batch Writes: Group multiple write operations (set, update, delete) into a single batch request to reduce overhead.
    Avoid Excessive Indexing: Disable default indexing on fields you do not query to save on storage and write costs.
    Use serverTimestamp(): Use Firestore's server timestamp rather than the device's clock to avoid issues with inconsistent device times that can trigger unnecessary updates. 

3. Optimize Cloud Functions and Backend 

    Minimize Cold Starts: Use minInstances to keep functions warm, reducing initialization time. However, be aware this has a fixed cost, so use it only on frequently used functions.
    Avoid Circular Triggers: Ensure a function triggered by a Firestore write does not write back to the same document, creating an infinite loop.
    Use Global Variables: Reuse objects (like database connections) outside the function handler to minimize re-initialization on warm starts.
    Use Cloud Run for Long Tasks: For heavy, long-running processes, use Cloud Run, which can be more cost-effective than Cloud Functions for sustained load. 

4. Optimize Cloud Storage and Network 

    Compress Data: Compress images and files on the client side before uploading them to Firebase Storage.
    Use CDN for Public Assets: Serve public files (images, files) via Firebase Hosting or a third-party CDN rather than directly from Cloud Storage to reduce data egress costs. 




    Write

Sign in
Managing Firebase Costs on High Traffic Applications: An Ultimate Guide to Keeping Your Budget Happy!
Proven Strategies, Real Code, and Practical Tips to Optimize Firebase for Scale without Breaking the Bank
Sehban Alam
Sehban Alam
4 min read
·
Nov 12, 2024

Struggling with Firebase costs on your high-traffic app? Learn proven strategies to manage Firebase expenses effectively. This guide includes practical tips, code examples, and error handling in the latest Firebase and Angular 18.
Press enter or click to view image in full size
Introduction

Is your Firebase bill climbing faster than your user count? High-traffic applications often face cost challenges on Firebase, but don’t worry — you don’t have to break up with Firebase! In this guide, we’ll go step-by-step through cost-saving techniques to keep your application fast, functional, and affordable. Plus, you’ll find a sprinkle of humor here and there to keep things fresh.
Table of Contents

    Optimize Firestore Reads and Writes
    Cache Firebase Data
    Use Firebase Functions Wisely
    Optimize Authentication Flows
    Enable Data Compression for Storage
    Conclusion

Step 1: Optimize Firestore Reads and Writes

Firebase Firestore charges for every document read, written, and deleted. Let’s make sure we’re not reading too much.
Code Example

// services/user.service.ts
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private firestore: AngularFirestore) {}
  // Optimized data fetching with minimal reads
  getUserById(userId: string): Observable<User | null> {
    return this.firestore
      .collection('users')
      .doc(userId)
      .valueChanges() // Only fetches updated data on changes
      .pipe(
        map((data) => (data ? (data as User) : null)),
        catchError((error) => {
          console.error('Error fetching user data:', error);
          return of(null); // Handle error and return default value
        })
      );
  }
}

Explanation

    valueChanges(): Only retrieves the data when it changes, reducing unnecessary reads.
    Error Handling: Catches and logs any errors, returning a safe fallback.

Best Practice

Use valueChanges() instead of snapshotChanges() to avoid unnecessary reads when only data updates are needed.
Bonus Tip

Indexes: Make sure you’re indexing fields used in queries to reduce latency and cost.
Step 2: Cache Firebase Data Locally

Reduce Firestore reads by caching frequently accessed data locally.
Code Example (Angular Service)

// services/cache.service.ts
import { Injectable } from '@angular/core';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private userCache = new Map<string, User>();
  constructor(private userService: UserService) {}
  getUserCached(userId: string): Observable<User | null> {
    if (this.userCache.has(userId)) {
      return of(this.userCache.get(userId));
    }
    return this.userService.getUserById(userId).pipe(
      tap((user) => {
        if (user) {
          this.userCache.set(userId, user);
        }
      })
    );
  }
}

Explanation

    Caching Strategy: Data is only fetched from Firestore if it’s not already cached.
    Memory Cache: Helps avoid extra reads by reusing data.

Best Practice

Set up expiration for cached data, especially if your data changes frequently.
Bonus Tip

Session Storage: For cross-session caching, consider storing frequently used data in sessionStorage.
Step 3: Use Firebase Functions Wisely

Firebase Functions can get pricey if misused. Limit function invocations by bundling logic into single functions and only calling when necessary.
Code Example

// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.updateUserScore = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }
  const userId = context.auth.uid;
  const newScore = data.score;
  return admin.firestore().collection('users').doc(userId).update({ score: newScore });
});

Explanation

    Authentication Check: Verifies the user is authenticated, preventing unauthorized calls.
    Single Call: Updates the user’s score in one function call, reducing total invocations.

Best Practice

Use onCall instead of onRequest to control function usage and limit it to authenticated users.
Bonus Tip

Timeout Settings: Set appropriate timeouts on expensive functions to prevent runaway billing.
Step 4: Optimize Authentication Flows

Firebase Authentication can add up with repeated sign-ins. Use silent sign-ins and session management to reduce load.
Code Example (Silent Sign-in)

// app.component.ts
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Injectable, OnInit } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AppComponent implements OnInit {
  constructor(private auth: AngularFireAuth) {}
  ngOnInit() {
    this.auth.authState.subscribe((user) => {
      if (user) {
        console.log('User is already signed in:', user);
      } else {
        this.auth.signInAnonymously();
      }
    });
  }
}

Explanation

    Silent Sign-in: Automatically signs in users if they’re already authenticated, reducing auth costs.
    Anonymous Sign-in: Only initiates a new session when necessary.

Best Practice

Only enable anonymous sign-ins when they’re truly beneficial; otherwise, they might add up.
Bonus Tip

Session Management: Use session-based auth to reduce the need for repeated authentication.
Step 5: Enable Data Compression for Storage

Large storage operations are expensive. Compress data before uploading to save storage space.
Code Example (Image Compression)

// upload-image.service.ts
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Injectable } from '@angular/core';
import Compressor from 'compressorjs';

@Injectable({
  providedIn: 'root',
})
export class UploadImageService {
  constructor(private storage: AngularFireStorage) {}
  uploadCompressedImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      new Compressor(file, {
        quality: 0.6, // Set quality to 60%
        success: (compressedFile) => {
          const filePath = `images/${compressedFile.name}`;
          const task = this.storage.upload(filePath, compressedFile);
          task
            .then(() => resolve(filePath))
            .catch((error) => reject(error));
        },
        error: (error) => reject(error),
      });
    });
  }
}

Explanation

    Image Compression: Reduces file size before uploading, which lowers storage costs.
    Error Handling: Provides fallbacks for any issues in the compression or upload process.

Best Practice

Use high-quality compression settings, but balance with image quality.
Bonus Tip

Bulk Compression: Use bulk compression for batches of files to save even more.
Directory Structure

- src
  - app
    - services
      - user.service.ts
      - cache.service.ts
      - upload-image.service.ts
    - app.component.ts
- functions
  - index.js

Conclusion

And there you have it! With these strategies, you’ll keep Firebase costs in check while still delivering a high-performance app. Whether it’s optimizing Firestore reads, using caching strategies, or compressing storage data, each step contributes to a more cost-effective Firebase experience.
Get Sehban Alam’s stories in your inbox

Join Medium for free to get updates from this writer.

For daily dose of SofTech, Follow me on LinkedIn: https://www.linkedin.com/in/sehbanalam/
Firebase
Google Cloud Platform
Backend Development
Firebase Cloud Functions

Sehban Alam
Written by Sehban Alam
652 followers
·
22 following

Software Engineer | Angular | AWS | Firebase | Problem Solver | Maybe Biased about Google Products & Services 😜
No responses yet

Write a response

What are your thoughts?
More from Sehban Alam
What is Zone.js in Angular?
Sehban Alam

Sehban Alam
What is Zone.js in Angular?
Learn why Angular removed Zone.js, its advantages, challenges, and how to refactor old code.
Oct 17, 2024
43
4
Create a Desktop App with Electron and Angular
Sehban Alam

Sehban Alam
Create a Desktop App with Electron and Angular
Build Modern Desktop Applications with Web Technologies
Nov 12, 2024
65
2
Best Practices for Storing Access Tokens in Angular
Sehban Alam

Sehban Alam
Best Practices for Storing Access Tokens in Angular
Access tokens are essential for securing modern web applications. Learn the best practices to store them.
Oct 21, 2024
171
2
Almost Perfect Prettier Settings for Your Angular Projects: A Step-by-Step Guide (2025)
Sehban Alam

Sehban Alam
Almost Perfect Prettier Settings for Your Angular Projects: A Step-by-Step Guide (2025)
Simplify Your Angular Codebase with This Step-by-Step Prettier Configuration Guide
Nov 30, 2024
4
3
See all from Sehban Alam
Recommended from Medium
Claude Code Ollama
Joe Njenga

Joe Njenga
I Tried New Claude Code Ollama Workflow ( It’s Wild & Free)
Claude Code now works with Ollama, which takes the game to the next level for developers who want to work locally or need flexible model…
Jan 19
1.4K
21
Stanford Just Killed Prompt Engineering With 8 Words (And I Can’t Believe It Worked)
Generative AI

In

Generative AI

by

Adham Khaled
Stanford Just Killed Prompt Engineering With 8 Words (And I Can’t Believe It Worked)
ChatGPT keeps giving you the same boring response? This new technique unlocks 2× more creativity from ANY AI model — no training required…
Oct 19, 2025
23K
602
Comparison of cheap VPS hosting providers
Yuri Novicow

Yuri Novicow
Comparison of cheap VPS hosting providers
Hetzner vs. OVHCloud vs. NetCup
Sep 19, 2025
12
3
How to Set Up Openclaw (Previously Clawdbot / Moltbot) — Step by Step guide to setup a personal bot
Neural Notions

In

Neural Notions

by

Nikhil
How to Set Up Openclaw (Previously Clawdbot / Moltbot) — Step by Step guide to setup a personal bot
Turn your own device into a personal AI assistant that lives inside your favorite apps
Jan 25
280
7
My (completely unnecessary) home lab setup
Andrew Larsen

Andrew Larsen
My (completely unnecessary) home lab setup
I’d like to think that I built my home lab for educational purposes — or for some noble quest to keep my data private.
Dec 8, 2025
25
The AI Bubble Is About To Burst, But The Next Bubble Is Already Growing
Will Lockett

Will Lockett
The AI Bubble Is About To Burst, But The Next Bubble Is Already Growing
Techbros are preparing their latest bandwagon.
Sep 14, 2025
22K
929
See more recommendations

Help

Status

About

Careers

Press

Blog

Privacy

Rules

Terms

Text to speech


 Optimize Database Performance

There are a few different ways to improve Firebase Realtime Database performance in your app. To find out what you can do to optimize your Realtime Database performance, gather data through the different Realtime Database monitoring tools, then make changes to your app or Realtime Database use accordingly.
Monitor Realtime Database performance

You can gather data about your Realtime Database's performance through a few different tools, depending on the level of granularity you need:

    High-level overview: Use the the profiler tool for a list of unindexed queries and a realtime overview of read/write operations.
    Billed usage estimate: Use the usage metrics available in the Firebase console to see your billed usage and high-level performance metrics.
    Detailed drilldown: Use Cloud Monitoring for a more granular look at how your database is performing over time.

Check for bugs: Before you start implementing any changes to your app, verify that it's syncing data the way you originally intended. To pinpoint issues, turn on debug logging in the Android, Objective-C, and Web SDKs. Check background and sync processes in your app to make sure it's downloading data at the frequency and volume you intended.
Improve performance by metric

Once you've gathered data, explore the following best practices and strategies based on the performance area you want to improve.
Performance improvement strategies at-a-glance
Metric 	Description 	Best practices
Load/Utilization 	Optimize how much of your database's capacity is in use processing requests at any given time (reflected in **Load** or **io/database_load** metrics). 	Optimize your data structure
Shard data across databases
Improve listener efficiency
Limit downloads with query-based rules
Optimize connections
Active connections 	Balance the number of simultaneous, active connections to your database to stay under the 200,000-connection limit. 	Shard data across databases
Reduce new connections
Outgoing bandwidth 	If the downloads from your database seem higher than you want them to be, you can improve the efficiency of your read operations and reduce encryption overhead. 	Optimize connections
Optimize your data structure
Limit downloads with query-based rules
Reuse SSL sessions
Improve listener efficiency
Restrict access to data
Storage 	Make sure you're not storing unused data, or balance your stored data across other databases and/or Firebase products to remain under quota. 	Clean up unused data
Optimize your data structure
Shard data across databases
Use Cloud Storage for Firebase
Optimize connections

RESTful requests like GET and PUT still require a connection, even though that connection is short-lived. These frequent, short-lived connections can actually add up to significantly more connection costs, database load, and outgoing bandwidth than realtime, active connections to your database.

Whenever possible, use the native SDKs for your app's platform, instead of the REST API. The SDKs maintain open connections, reducing the SSL encryption costs and database load that can add up with the REST API.

If you do use the REST API, consider using an HTTP keep-alive to maintain an open connection or use server-sent events, which can reduce costs from SSL handshakes.
Shard data across multiple databases

Splitting your data across multiple Realtime Database instances, otherwise known as database sharding, offers three benefits:

    Increase the total simultaneous, active connections allowed on your app by splitting them across database instances.
    Balance load across database instances.
    If you have independent groups of users that only need access to discrete data sets, use different database instances for higher throughput and lower latency.

If you're on the Blaze pricing plan, you can create multiple database instances within the same Firebase project, leveraging a common user authentication method across database instances.

Learn more about how and when to shard data.
Build efficient data structures

Because Realtime Database retrieves the data from a path's child nodes as well as the path, it makes sense to keep your data structure as flat as possible. This way, you can selectively retrieve the data you need, without also downloading unnecessary data to clients.

In particular, consider writes and deletes when you're structuring your data. For example, paths with thousands of leaves are potentially expensive to delete. Splitting them up into paths with multiple subtrees and fewer leaves per node can speed up deletes.

Additionally, each write can take up 0.1% of your total database utilization. Structure your data in a way that allows you to batch writes into a single operation as multi-path updates through either the update() methods in the SDKs or RESTful PATCH requests.

To optimize your data structure and improve performance, follow the best practices for data structures.
Prevent unauthorized access

Prevent unauthorized operations on your database with Realtime Database Security Rules. For example, using rules could avoid a scenario where a malicious user repeatedly downloads your entire database.

Learn more about using Firebase Realtime Database Rules.
Use query-based rules to limit downloads

Realtime Database Security Rules restrict access to data in your database, but they can also serve as limits on data returned through read operations. When you use query-based rules, as defined by query. expressions like query.limitToFirst, queries only retrieve the data bounded by the rule.

For example, the following rule limits read access to only the first 1000 results of a query, as ordered by priority:

messages: {
  ".read": "query.orderByKey &&
            query.limitToFirst <= 1000"
}

// Example query:
db.ref("messages").limitToFirst(1000)
                  .orderByKey("value")

Learn more about Realtime Database Security Rules.
Index queries

Indexing your data reduces the total bandwidth you use for each query your app runs.
Reuse SSL sessions

Reduce SSL encryption overhead costs on resumed connections by issuing TLS session tickets. This is particularly helpful if you do require frequent, secure connections to the database.
Improve listener efficiency

Place your listeners as far down the path as you can to limit the amount of data they sync. Your listeners should be close to the data you want them to get. Don't listen at the database root, as that results in downloads of your entire database.

Add queries to limit the data that your listen operations return and use listeners that only download updates to data — for example, on() instead of once(). Reserve .once() for actions that truly don’t require data updates. Additionally, sort your queries using orderByKey(), whenever possible, for the best performance. Sorting with orderByChild() can be 6-8 times slower, and sorting with orderByValue() can be very slow for large data sets, since it requires a read of the entire location from the persistence layer.

Make sure to also add listeners dynamically, and remove them when they're no longer necessary.
Clean up unused data

Periodically remove any unused or duplicate data in your database. You can run backups to manually inspect your data or periodically back it up to a Google Cloud Storage bucket. Also consider hosting stored data through Cloud Storage for Firebase.
Ship scalable code you can update

Apps built into IoT devices should include scalable code that you can update easily. Make sure to test use cases thoroughly, account for scenarios where you might grow your userbase exponentially, and build in the ability to deploy updates to your code. Carefully consider major changes you might need to make down the line, if, for example, you decide to shard your data.



