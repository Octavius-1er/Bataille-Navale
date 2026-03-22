// src/lib/defaultGame.js
export const DEFAULT_GAME = {
  id: '__default_english__',
  name: 'Anglais — Preterit',
  subject: 'Anglais',
  isDefault: true,
  preterit: { Eat:'ate', Have:'had', Leave:'left', Put:'put', Meet:'met', Sing:'sang' },
  rows: ['I', 'You', 'He / She', 'We', 'They'],
  cols: ['Eat', 'Have', 'Leave', 'Put', 'Meet', 'Sing'],
  forms: ['positive', 'negative', 'interrogative'],
  cells: [
    [
      { prompt: 'A brownie',              answers: { positive: 'I ate a brownie.',              negative: "I didn't eat a brownie.",              interrogative: 'Did I eat a brownie?' } },
      { prompt: 'A good grade',           answers: { positive: 'I had a good grade.',           negative: "I didn't have a good grade.",           interrogative: 'Did I have a good grade?' } },
      { prompt: 'Earlier',                answers: { positive: 'I left earlier.',               negative: "I didn't leave earlier.",               interrogative: 'Did I leave earlier?' } },
      { prompt: 'My headphone',           answers: { positive: 'I put my headphone.',           negative: "I didn't put my headphone.",            interrogative: 'Did I put my headphone?' } },
      { prompt: 'King Charles 3',         answers: { positive: 'I met King Charles 3.',         negative: "I didn't meet King Charles 3.",         interrogative: 'Did I meet King Charles 3?' } },
      { prompt: 'Very well',              answers: { positive: 'I sang very well.',             negative: "I didn't sing very well.",              interrogative: 'Did I sing very well?' } }
    ],
    [
      { prompt: 'Nothing',                answers: { positive: 'You ate nothing.',              negative: "You didn't eat nothing.",               interrogative: 'Did you eat nothing?' } },
      { prompt: 'Something',              answers: { positive: 'You had something.',            negative: "You didn't have something.",            interrogative: 'Did you have something?' } },
      { prompt: 'Happy',                  answers: { positive: 'You left happy.',               negative: "You didn't leave happy.",               interrogative: 'Did you leave happy?' } },
      { prompt: 'This here',              answers: { positive: 'You put this here.',            negative: "You didn't put this here.",             interrogative: 'Did you put this here?' } },
      { prompt: 'Mrs Hemet',              answers: { positive: 'You met Mrs Hemet.',            negative: "You didn't meet Mrs Hemet.",            interrogative: 'Did you meet Mrs Hemet?' } },
      { prompt: 'Like an angel',          answers: { positive: 'You sang like an angel.',       negative: "You didn't sing like an angel.",        interrogative: 'Did you sing like an angel?' } }
    ],
    [
      { prompt: 'Fries',                  answers: { positive: 'He / She ate fries.',           negative: "He / She didn't eat fries.",            interrogative: 'Did he / she eat fries?' } },
      { prompt: 'A good day',             answers: { positive: 'He / She had a good day.',      negative: "He / She didn't have a good day.",      interrogative: 'Did he / she have a good day?' } },
      { prompt: 'His/Her family',         answers: { positive: 'He / She left his/her family.', negative: "He / She didn't leave his/her family.", interrogative: 'Did he / she leave his/her family?' } },
      { prompt: 'Favorite dress',         answers: { positive: 'He / She put favorite dress.',  negative: "He / She didn't put favorite dress.",   interrogative: 'Did he / she put favorite dress?' } },
      { prompt: 'His/Her foster family',  answers: { positive: 'He / She met his/her foster family.', negative: "He / She didn't meet his/her foster family.", interrogative: 'Did he / she meet his/her foster family?' } },
      { prompt: 'Makotoude',              answers: { positive: 'He / She sang makotoude.',      negative: "He / She didn't sing makotoude.",       interrogative: 'Did he / she sing makotoude?' } }
    ],
    [
      { prompt: 'Lemons',                 answers: { positive: 'We ate lemons.',                negative: "We didn't eat lemons.",                 interrogative: 'Did we eat lemons?' } },
      { prompt: 'Some Candles',           answers: { positive: 'We had some candles.',          negative: "We didn't have some candles.",          interrogative: 'Did we have some candles?' } },
      { prompt: 'London',                 answers: { positive: 'We left London.',               negative: "We didn't leave London.",               interrogative: 'Did we leave London?' } },
      { prompt: '5 stars to our driver',  answers: { positive: 'We put 5 stars to our driver.', negative: "We didn't put 5 stars to our driver.",  interrogative: 'Did we put 5 stars to our driver?' } },
      { prompt: 'Our idol',               answers: { positive: 'We met our idol.',              negative: "We didn't meet our idol.",              interrogative: 'Did we meet our idol?' } },
      { prompt: 'Like pans',              answers: { positive: 'We sang like pans.',            negative: "We didn't sing like pans.",             interrogative: 'Did we sing like pans?' } }
    ],
    [
      { prompt: 'Some eggs',              answers: { positive: 'They ate some eggs.',           negative: "They didn't eat some eggs.",            interrogative: 'Did they eat some eggs?' } },
      { prompt: 'A phone',                answers: { positive: 'They had a phone.',             negative: "They didn't have a phone.",             interrogative: 'Did they have a phone?' } },
      { prompt: 'Yesterday',              answers: { positive: 'They left yesterday.',          negative: "They didn't leave yesterday.",          interrogative: 'Did they leave yesterday?' } },
      { prompt: 'Smiles on their faces',  answers: { positive: 'They put smiles on their faces.', negative: "They didn't put smiles on their faces.", interrogative: 'Did they put smiles on their faces?' } },
      { prompt: 'My cat',                 answers: { positive: 'They met my cat.',              negative: "They didn't meet my cat.",              interrogative: 'Did they meet my cat?' } },
      { prompt: '99 Luftballons',         answers: { positive: 'They sang 99 Luftballons.',     negative: "They didn't sing 99 Luftballons.",      interrogative: 'Did they sing 99 Luftballons?' } }
    ]
  ]
}
