'use strict';

var fs = require('fs');
var nock = require('nock');
var watson = require('../../index');
var assert = require('assert');
var wav = require('wav');
var path = require('path');
var async = require('async');

describe('integration-all-services', function() {

  var TWENTY_SECONDS = 20000;
  var THIRTY_SECONDS = 30000;
  var TEN_SECONDS = 10000;
  var FIVE_SECONDS = 5000;
  var TWO_SECONDS = 2000;

  // these tests depend on service credentials in auth.js
  // of that file is not present (expected on pull requests and such), skip these tests
  if (!fs.existsSync(path.join(__dirname, '../resources/auth.js'))) {
    console.warn('no test/resources/auth.js, skipping integration tests'); // eslint-disable-line no-console
    return;
  }

  var auth = require('./../resources/auth');

  var mobydick = fs.readFileSync(path.join(__dirname, '../resources/mobydick.txt'), 'utf8');

  this.retries(1);

  this.slow(TWO_SECONDS); // this controls when the tests get a colored warning for taking too long

  before(function() {
    nock.enableNetConnect();
  });

  after(function() {
    nock.disableNetConnect();
  });

  describe('functional_tone_analyzer', function() {
    this.timeout(TWENTY_SECONDS);
    var tone_analyzer = watson.tone_analyzer(auth.tone_analyzer);

    it('tone()', function(done) {
      tone_analyzer.tone({text: mobydick}, done);
    });

  });

  describe('functional_personality_insights', function() {
    this.timeout(TWENTY_SECONDS);
    var personality_insights = watson.personality_insights(auth.personality_insights);

    it('profile()', function(done) {
      var params = {
        text: mobydick
      };
      personality_insights.profile(params, done);
    });

    it('profile_html()', function(done) {
      var params = {
        text: '<div>' + mobydick + '</div>'
      };
      personality_insights.profile(params, done);
    });
});

  describe('functional_visual_recognition', function() {

    describe('v3', function() {

      // ugh.
      this.timeout(THIRTY_SECONDS * 4);
      this.retries(5);

      var visual_recognition = watson.visual_recognition(auth.visual_recognition.v3);

      it('should return error when invalid api_key', function(done) {
        var constructor = auth.visual_recognition.v3;
        constructor.api_key = 'not-a-valid-key';
        var recognition = watson.visual_recognition(constructor);

        recognition.listClassifiers({}, function(err) {
          if (err) {
            return done();
          } else {
            return done('Should return an error');
          }
        });
      });

      describe('classify()', function() {
        it('should classify an uploaded image', function(done) {
          var params = {
            images_file: fs.createReadStream(__dirname + '/../resources/car.png')
          };
          visual_recognition.classify(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].image, 'car.png');
            assert(result.images[0].classifiers.length);
            assert(result.images[0].classifiers[0].classes.some(function(c) {
              return c.class === 'car'
            }));

            done();
          });
        });

        it('should classify an image via url', function(done) {
          var params = {
            url: 'https://watson-test-resources.mybluemix.net/resources/car.png'
          };
          visual_recognition.classify(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].resolved_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert.equal(result.images[0].source_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert(result.images[0].classifiers.length);
            assert(result.images[0].classifiers[0].classes.some(function(c) {
              return c.class === 'car'
            }));

            done();
          });
        });
      });

      describe('detectFaces()', function() {
        it('should detect faces in an uploaded image', function(done) {
          var params = {
            images_file: fs.createReadStream(__dirname + '/../resources/obama.jpg')
          };
          visual_recognition.detectFaces(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].image, 'obama.jpg');
            assert.equal(result.images[0].faces.length, 1, 'There should be exactly one face detected'); // note: the api was sometimes failing to detect any faces right after the release
            var face = result.images[0].faces[0];
            assert.equal(face.gender.gender, 'MALE');
            assert.equal(face.identity.name, 'Barack Obama');
            done();
          });
        });

        it('should detect faces in an image via url', function(done) {
          var params = {
            url: 'https://watson-test-resources.mybluemix.net/resources/obama.jpg'
          };
          visual_recognition.detectFaces(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));
            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].resolved_url, 'https://watson-test-resources.mybluemix.net/resources/obama.jpg');
            assert.equal(result.images[0].source_url, 'https://watson-test-resources.mybluemix.net/resources/obama.jpg');
            assert.equal(result.images[0].faces.length, 1, 'There should be exactly one face detected'); // note: the api was sometimes failing to detect any faces right after the release
            var face = result.images[0].faces[0];
            assert.equal(face.gender.gender, 'MALE');
            assert.equal(face.identity.name, 'Barack Obama');
            done();
          });
        });
      });

      // this endpoint is flaky.
      // reported the issue to the team, but disabling the test for now.
      describe('recognizeText()', function() {
        it('read text in an uploaded image', function(done) {

          var params = {
            images_file: fs.createReadStream(__dirname + '/../resources/car.png')
          };
          visual_recognition.recognizeText(params, function(err, result) {
            if (err) {
              return done(err);
            }

            //console.log(JSON.stringify(actual, null, 2));

            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].image, 'car.png');
            assert(result.images[0].text);
            assert(result.images[0].words.length);

            done();
          });
        });

        it('read text an image via url', function(done) {

          var params = {
            url: 'https://watson-test-resources.mybluemix.net/resources/car.png'
          };
          visual_recognition.recognizeText(params, function(err, result) {
            if (err) {
              return done(err);
            }
            //console.log(JSON.stringify(result, null, 2));

            assert.equal(result.images_processed, 1);
            assert.equal(result.images[0].resolved_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert.equal(result.images[0].source_url, 'https://watson-test-resources.mybluemix.net/resources/car.png');
            assert(result.images[0].text);
            assert(result.images[0].words.length);

            done();
          });
        });
      });


      // todo: add more tests, consider splitting things between a permanent and a temporary classifier
      describe("custom classifiers", function() {
        var classifier_id;
        this.retries(0);

        it('createClassifier()', function(done) {
            visual_recognition.createClassifier({
              name: 'light_dark_test_temporary',
              light_positive_examples: fs.createReadStream(path.join(__dirname, '../resources/light.zip')),
              dark_positive_examples: fs.createReadStream(path.join(__dirname, '../resources/dark.zip'))
            }, function(err, response) {
              if (err) {
                return done(err)
              }
              assert(response);
              assert(response.classifier_id);
              classifier_id = response.classifier_id;
              done();
            });
        });

        it('listClassifiers()', function(done) {
          visual_recognition.listClassifiers({}, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result.classifiers);
            assert(result.classifiers.length);
            // hack until we're allowed multiple classifiers
            if (!classifier_id) {
              classifier_id = result.classifiers[0].classifier_id;
            }
            // var permament_classifiers = result.classifiers.filter(function(c) {
            //   return c.classifier_id === classifier_id;
            // });
            // assert(permament_classifiers.length);
            done();
          });
        });

        it('getClassifier()', function(done) {
          visual_recognition.getClassifier({classifier_id: classifier_id}, function(err, classifier){
            if (err) {
              return done(err);
            }
            assert.equal(classifier.classifier_id, classifier_id);
            assert.equal(classifier.name, 'light_dark_test_temporary');
            assert.deepEqual(classifier.classes, [{"class":"light"},{"class":"dark"}]);
            done();
          });
        });

        it('deleteClassifier()', function(done) {
          visual_recognition.deleteClassifier({classifier_id: classifier_id}, done);
        })

    }); // custom classifiers


      describe("collections", function() {
        this.retries(0);
        var collection_id;
        var image_id;


        // there is currently a limit of 5 collections per service instance
        // so, this automatically deletes any existing collections that are > 15 minutes old
        // presumably they were left from previous (failed) test runs
        before(function(done) {
          visual_recognition.listCollections({}, function(err, result) {
            if (err) {
              return done(err);
            }
            var cutoff = new Date();
            cutoff.setMinutes(cutoff.getMinutes() - 15);
            if (result.collections && Array.isArray(result.collections)) {
              async.forEach(result.collections, function(col, next) {
                if (new Date(col.created) < cutoff) {
                  // eslint-disable-next-line no-console
                  console.log('Deleting old collection before running tests', col);
                  visual_recognition.deleteCollection({collection_id: col.collection_id}, function(err) {
                    if (err) {
                      // eslint-disable-next-line no-console
                      console.error('error deleting collection:', err, col);
                    }
                    next(); // even if it failed, go to the next step
                  });
                } else {
                  next();
                }
              }, done);
            } else {
              done();
            }
          });
        });

        it('createCollection()', function(done) {
          visual_recognition.createCollection({name: "integration_test_" + Date.now()}, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result.collection_id);
            collection_id = result.collection_id;
            done();
          });
        });

        it('listCollections()', function(done) {
          visual_recognition.listCollections({}, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result);
            assert(result.collections);
            assert(result.collections.length);
            // todo: consider looping through collections to assert that collection_id is in the list
            done();
          });
        });


        it('getCollection()', function(done) {
          visual_recognition.getCollection({collection_id: collection_id}, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result);
            assert.equal(result.collection_id, collection_id);
            done();
          });
        });

        it('addImage()', function(done) {
          visual_recognition.addImage({
            collection_id: collection_id,
            image_file: fs.createReadStream(path.join(__dirname, '../resources/obama.jpg')),
            metadata: {foo: 'bar'}
          }, function(err, response) {
            if (err) {
              return done(err);
            }
            assert(response);
            assert.equal(response.images_processed, 1);
            assert(response.images);
            assert(response.images.length);
            assert(response.images[0].image_id);
            image_id = response.images[0].image_id;
            assert.equal(response.images[0].image_file, "obama.jpg");
            assert(response.images[0].metadata);
            assert.equal(response.images[0].metadata.foo, "bar");
            done();
          });
        });

        it('listImages()', function(done) {
          visual_recognition.listImages({collection_id: collection_id}, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result);
            assert(result.images);
            assert(result.images.length);
            done();
          });
        });

        it('getImage()', function(done) {
          visual_recognition.getImage({
            collection_id: collection_id,
            image_id: image_id
          }, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result);
            assert(result.image_id);
            done();
          });
        });

        it('setImageMetadata', function(done) {
          visual_recognition.setImageMetadata({
            collection_id: collection_id,
            image_id: image_id,
            metadata: {baz: 'bam'}
          }, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result);
            assert.equal(result.baz, 'bam');
            done();
          });
        });

        it('getImageMetadata()', function(done) {
          visual_recognition.getImageMetadata({
            collection_id: collection_id,
            image_id: image_id
          }, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result);
            assert.equal(result.baz, 'bam');
            done();
          });
        });

        it('findSimilar()', function(done) {
          visual_recognition.findSimilar({
            collection_id: collection_id,
            image_file: fs.createReadStream(path.join(__dirname, '../resources/obama2.jpg')),
          }, function(err, result) {
            if (err) {
              return done(err);
            }
            assert(result);
            assert(result.images_processed);
            assert(result.similar_images);
            done();
          });
        });

        it('deleteImageMetadata()', function(done) {
          visual_recognition.deleteImageMetadata({
            collection_id: collection_id,
            image_id: image_id
          }, done);
        });

        it('deleteImage()', function(done) {
          visual_recognition.deleteImage({
            collection_id: collection_id,
            image_id: image_id
          }, done);
        });

        it('deleteCollection()', function(done) {
          visual_recognition.deleteCollection({collection_id: collection_id}, done);
        });
      }); // collections
    }); // v3
  }); // vr

  describe('functional_tradeoff_analytics', function() {
    this.timeout(TWENTY_SECONDS);
    var tradeoff_analytics = watson.tradeoff_analytics(auth.tradeoff_analytics);

    it('dilemmas()', function(done) {
      var params = require('./../resources/dilemma_problem');
      tradeoff_analytics.dilemmas(params, done);
    });

    it('events()', function(done) {
      var params = require('./../resources/ta_events');
      tradeoff_analytics.events(params, done);
    });
  });

  describe('functional_text_to_speech', function() {
    this.timeout(TWENTY_SECONDS);
    var text_to_speech = watson.text_to_speech(auth.text_to_speech);

    it('voices()', function(done) {
      text_to_speech.voices(null, done);
    });

    it('synthesize()', function(done) {
      var params = {
        text: 'test',
        accept: 'audio/wav'
      };
      // wav.Reader parses the wav header and will throw if it isn't valid
      var reader = new wav.Reader();
      text_to_speech.synthesize(params)
        .pipe(reader)
        .on('format', done.bind(null,null));
    });

    it('pronunciation()', function(done) {
      var checkPronunciation = function(err, res) {
        assert.ifError(err);
        assert.equal(JSON.stringify(res), JSON.stringify({
          "pronunciation": ".ˈaɪ .ˈi .ˈi .ˈi"
        }));
        done();
      };

      text_to_speech.pronunciation({text: 'IEEE'}, checkPronunciation);
    });
  });


  describe('functional_dialog', function() {
    this.timeout(THIRTY_SECONDS * 3);
    var dialog = watson.dialog(auth.dialog);
    var dialog_id = auth.dialog.dialog_id;
    var client_id = 31;

    it('getProfile()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        name: ['size', 'method']
      };
      dialog.getProfile(params, done);
    });

    it('updateProfile()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        name_values: [{
          name: 'size',
          value: 'large'
        }, {
          name: 'topping1',
          value: 'cheese'
        }]
      };
      dialog.updateProfile(params, done);
    });

    it('getConversation()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        date_from: '2015-07-20 00:00:00',
        date_to: '2015-07-30 00:00:00'
      };
      dialog.getConversation(params, done);
    });

    it('conversation()', function(done) {
      var params = {
        dialog_id: dialog_id,
        client_id: client_id,
        input: 'Hello'
      };
      dialog.conversation(params, done);
    });

    // it('updateContent()', function(done) {
    //   this.timeout(10000);
    //   var params = {
    //     dialog_id: dialog_id,
    //     client_id: client_id
    //   };
    //   dialog.updateContent(params, done);
    // });

    it('getContent()', function(done) {
      var params = {
        dialog_id: dialog_id
      };
      dialog.getContent(params, done);
    });

    it('getDialogs()', function(done) {
      var params = {};
      dialog.getDialogs(params, done);
    });
  });

  describe('functional_language_translation', function() {
    this.timeout(TWENTY_SECONDS * 2);
    var language_translation = watson.language_translation(auth.language_translation);

    it('getModels()', function(done) {
      language_translation.getModels(null, done);
    });

    it('translate()', function(done) {
      var params = {
        text: 'this is a test',
        source: 'en',
        target: 'es'
      };
      language_translation.translate(params, done);
    });

    it('getIdentifiableLanguages()', function(done) {
      language_translation.getIdentifiableLanguages(null, done);
    });

    it('identify()', function(done) {
      var params = {
        text: 'this is an important test that needs to work'
      };
      language_translation.identify(params, done);
    });
  });

  describe('functional_language_translator', function() {
    this.timeout(TWENTY_SECONDS * 2);
    var language_translator = watson.language_translator(auth.language_translator);

    it('getModels()', function(done) {
      language_translator.getModels(null, done);
    });

    it('translate()', function(done) {
      var params = {
        text: 'this is a test',
        source: 'en',
        target: 'es'
      };
      language_translator.translate(params, done);
    });

    it('getIdentifiableLanguages()', function(done) {
      language_translator.getIdentifiableLanguages(null, done);
    });

    it('identify()', function(done) {
      var params = {
        text: 'this is an important test that needs to work'
      };
      language_translator.identify(params, done);
    });
  });

  describe('functional_alchemy_language', function() {
    var alchemy_language = watson.alchemy_language(auth.alchemy);
    var text = fs.readFileSync(__dirname + '/../resources/alchemy-text.txt', 'utf8');
    this.timeout(FIVE_SECONDS);

    it('entities()', function(done) {
      alchemy_language.entities({
        text: text
      }, done);
    });

    it('keywords()', function(done) {
      alchemy_language.keywords({
        text: text
      }, done);
    });


    it('concepts()', function(done) {
      alchemy_language.concepts({
        text: text
      }, done);
    });

    it('emotion()', function(done) {
      alchemy_language.emotion({
        text: text
      }, done);
    });

    it('sentiment()', function(done) {
      alchemy_language.sentiment({
        text: text
      }, done);
    });

    it('sentiment_targeted()', function(done) {
      alchemy_language.sentiment({
        text: text,
        target: 'Peter Higgs'
      }, done);
    });

    it('sentiment_multiple_targets_with_pipe()', function(done) {
      alchemy_language.sentiment({
        text: text,
        targets: 'United States|Peter Higgs'
      }, done);
    });

    it('sentiment_multiple_targets_with_array()', function(done) {
      alchemy_language.sentiment({
        text: text,
        targets: ['United States','Peter Higgs']
      }, done);
    });

    it('category()', function(done) {
      alchemy_language.category({
        text: text
      }, done);
    });

    it('publicationDate()', function(done) {
      alchemy_language.publicationDate({
        html: text
      }, done);
    });

    it('relations()', function(done) {
      alchemy_language.relations({
        text: text
      }, done);
    });

    it('language()', function(done) {
      alchemy_language.language({
        text: text
      }, done);
    });

    it('text()', function(done) {
      alchemy_language.text({
        html: text
      }, done);
    });

    it('text_raw()', function(done) {
      alchemy_language.text({
        html: text,
        raw: true
      }, done);
    });

    it('authors()', function(done) {
      alchemy_language.authors({
        html: text
      }, done);
    });

    it('feeds()', function(done) {
      alchemy_language.feeds({
        url: 'https://developer.ibm.com/watson/blog/'
      }, done);
    });

    it('microformats()', function(done) {
      alchemy_language.microformats({
        url: 'http://www.alchemyapi.com/products/alchemylanguage/microformats-parsing'
      }, done);
    });

    it('taxonomy()', function(done) {
      alchemy_language.taxonomy({
        html: text
      }, done);
    });

    it('combined()', function(done) {
      alchemy_language.combined({
        text: text
      }, done);
    });

    describe('typedRelations()', function() {
      it('should process html', function(done) {
        alchemy_language.typedRelations({
          html: text
        }, done);
      });

      it('should process text', function(done) {
        alchemy_language.typedRelations({
          text: text
        }, done);
      });
    });
  });

  describe('functional_alchemy_data_news', function() {
    var alchemy_data_news = watson.alchemy_data_news(auth.alchemy);

    it('getNews()', function(done) {
      alchemy_data_news.getNews({
        start: 'now-1d',
        end: 'now',
        count: 100,
        'q.enriched.url.enrichedTitle.relations.relation': '|action.verb.text=acquire,object.entities.entity.type=Company|',
        return: 'enriched.url.title'
      }, done);
    });
  });

  describe('functional_alchemy_vision', function() {
    this.timeout(TWENTY_SECONDS);
    var alchemy_vision = watson.alchemy_vision(auth.alchemy);
    var imageFile = fs.createReadStream(__dirname + '/../resources/obama.jpg');

    it('getImageLinks() with url', function(done) {
      alchemy_vision.getImageLinks({
        url: 'http://www.alchemyapi.com/products/alchemylanguage/microformats-parsing'
      }, done);
    });

    it('getImageLinks() with html', function(done) {
      alchemy_vision.getImageLinks({
        html: '<div><img src="https://watson-test-resources.mybluemix.net/resources/obama.jpg" /></div>'
      }, done);
    });

    it('getImageKeywordsWithFile()', function(done) {
      alchemy_vision.getImageKeywords({image: imageFile}, done);
    });

    it('getImageKeywordsWithUrl()', function(done) {
      alchemy_vision.getImageKeywords({
        url: 'https://watson-test-resources.mybluemix.net/resources/obama.jpg'
      }, done);
    });

    // it('recognizeFacesWithFile()', function(done) {
    //   alchemy_vision.recognizeFaces({image: imageFile}, done);
    // });

    it('recognizeFacesWithUrl()', function(done) {
      alchemy_vision.recognizeFaces({
        url: 'https://watson-test-resources.mybluemix.net/resources/obama.jpg'
      }, done);
    });

    it('getImageSceneText()', function(done) {
      alchemy_vision.getImageSceneText({
        url: 'https://watson-test-resources.mybluemix.net/resources/open.png'
      }, done);
    });
  });

  describe('functional_document_conversion', function() {
    this.timeout(TWENTY_SECONDS);
    describe('v1', function() {
      var document_conversion = watson.document_conversion(auth.document_conversion);

      it('convertFile()', function(done) {
        document_conversion.convert({
          file: fs.createReadStream(__dirname + '/../resources/sampleWord.docx'),
          conversion_target: 'ANSWER_UNITS',
          // word: {
          //   heading: {
          //     fonts: [
          //       { level: 1, min_size: 24 },
          //       { level: 2, min_size: 16, max_size: 24 }
          //     ]
          //   }
          // }
        }, done);
      });

      it('convertFile() with overridden content-type', function(done) {
        document_conversion.convert({
          conversion_target: 'ANSWER_UNITS',
            file: fs.createReadStream(__dirname + '/../resources/sampleWordWrongExtension.html'),
          content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }, function(err, res) {
          if (err) {
            return done(err);
          }
          assert(res);
          assert(res.media_type_detected, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          assert(res.answer_units);
          assert(res.answer_units.length);
          assert(res.answer_units[0].id);
          done();
        });
      });

      it('convertFile() buffer with content-type', function(done) {
        document_conversion.convert({
          conversion_target: 'ANSWER_UNITS',
          file: new Buffer(fs.readFileSync(__dirname + '/../resources/sampleWordWrongExtension.html')),
          content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }, function(err, res) {
          if (err) {
            return done(err);
          }
          assert(res);
          assert(res.media_type_detected, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          assert(res.answer_units);
          assert(res.answer_units.length);
          assert(res.answer_units[0].id);
          done();
        });
      });
    });
  });

  describe('functional_conversation', function() {
    this.timeout(TEN_SECONDS);
    var conversation = watson.conversation(auth.conversation);

    // disabling until https://github.ibm.com/watson-engagement-advisor/wea-backlog/issues/2388 is resolved
    it.skip('message()', function(done) {
      var params = {
          input: {
            text: 'Turn on the lights'
          },
          alternate_intents: true,
          workspace_id: auth.conversation.workspace_id
      };

      conversation.message(params, function(err, result) {
        if (err) {
          return done(err);
        }
        assert.equal(result.alternate_intents, true);
        done();
      });
    });
  });

});
