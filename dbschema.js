let db = {
    posts: [
        {
          userHandle: 'user',
          body: 'This is a dummy Post',
          createdAt: '2020-05-21T15:33:01.018Z',
          authorId: 'dcab8837svdgwu9',
          imgUrl: 'https://unsplash.com/dream',
          likeCount: 5 ,
          commentCount: 2,
        }
   ],
   comments: [
     {
       userHandle: 'user',
       postId: 'YywdfuvYWTIYEDT',
       body: 'Nice post',
       createdAt: '2020-05-21T15:33:01.018Z',
     }
   ],
   notifications: [
     {
       recipient: 'user',
       sender: 'Pink Guy',
       read: 'true||false',
       postId: 'weyff2oyrurtdfvjfeiqrwghh',
       type: 'Like||Comment',
       createdAt: '2020-05-21T15:33:01.018Z',
     }
   ]
};

const userDetails = {
  //For Redux
  credentials: {
    userId: "uyeuyeegfefuiowp1i283ydhge",
    email: "test@test.com",
    userHandle: "Lolicon",
    createdAt: "2020-05-21T15:33:01.018Z",
    imageUrl: "https://unsplash.com/dream",
    bio: "My bio",
    website: "https://hentaiheaven.org",
    location: "Santa Monica, LA"
  },
  likes: [{
    userHandle: "user",
    postId: "tettdfhfdywogbccvvdgwiw",
  },
    {
    userHandle: "Lolilover",
    postId: "gei3ytreqdvjeqgietwydvy",
    }
  ]
}