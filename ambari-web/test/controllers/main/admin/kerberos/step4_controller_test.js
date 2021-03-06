/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
var c = App.KerberosWizardStep4Controller.create({
  wizardController: Em.Object.create({
    name: ''
  })
});
describe('App.KerberosWizardStep4Controller', function() {

  App.TestAliases.testAsComputedEqual(c, 'isWithinAddService', 'wizardController.name', 'addServiceController');

  describe('#isSubmitDisabled', function() {
    var controller = App.KerberosWizardStep4Controller.create({});
    var configs = Em.A([
      App.ServiceConfigProperty.create({ name: 'prop1', value: 'someVal1', identityType: 'user', category: 'Ambari Principals', serviceName: 'Cluster'})
    ]);
    controller.set('stepConfigs', controller.createServiceConfig(configs));

    it('configuration errors are absent, submit should be not disabled', function() {
      expect(controller.get('stepConfigs')[0].get('errorCount')).to.be.equal(0);
      expect(controller.get('isSubmitDisabled')).to.be.false;
    });

    it('config has invalid value, submit should be disabled', function() {
      var serviceConfig = controller.get('stepConfigs')[0];
      serviceConfig.get('configs').findProperty('name', 'prop1').set('value', '');
      expect(serviceConfig.get('errorCount')).to.be.equal(1);
      expect(controller.get('isSubmitDisabled')).to.be.true;
    });
  });

  describe('#createServiceConfig', function() {
    var controller = App.KerberosWizardStep4Controller.create({});
    it('should create instance of App.ServiceConfig', function() {
      var configs = controller.createServiceConfig([], []);
      expect(configs).to.have.property('length').equal(2);
      expect(configs[0]).to.be.instanceof(App.ServiceConfig);
      expect(configs[1]).to.be.instanceof(App.ServiceConfig);
    });
  });

  describe('#prepareConfigProperties', function() {

    var properties = Em.A([
      Em.Object.create({ name: 'realm', value: '', serviceName: 'Cluster' }),
      Em.Object.create({ name: 'spnego_keytab', value: 'spnego_keytab_value', serviceName: 'Cluster' }),
      Em.Object.create({ name: 'hdfs_keytab', value: '', serviceName: 'HDFS', identityType: 'user', observesValueFrom: 'spnego_keytab' }),
      Em.Object.create({ name: 'falcon_keytab', value: 'falcon_keytab_value', serviceName: 'FALCON' }),
      Em.Object.create({ name: 'mapreduce_keytab', value: 'mapreduce_keytab_value', serviceName: 'MAPREDUCE2' }),
      Em.Object.create({ name: 'hdfs_principal', value: 'hdfs_principal_value', identityType: 'user', serviceName: 'HDFS' }),
      Em.Object.create({ name: 'hadoop.security.auth_to_local', serviceName: 'HDFS' })
    ]);

    var propertyValidationCases = [
      {
        property: 'spnego_keytab',
        e: [
          { key: 'category', value: 'Global' },
          { key: 'observesValueFrom', absent: true }
        ]
      },
      {
        property: 'realm',
        e: [
          { key: 'category', value: 'Global' },
          { key: 'value', value: 'realm_value' }
        ]
      },
      {
        property: 'hdfs_keytab',
        e: [
          { key: 'category', value: 'Ambari Principals' },
          { key: 'value', value: 'spnego_keytab_value' },
          { key: 'observesValueFrom', value: 'spnego_keytab' }
        ]
      },
      {
        property: 'hadoop.security.auth_to_local',
        e: [
          { key: 'displayType', value: 'multiLine' }
        ]
      }
    ];

    var absentPropertiesTest = ['falcon_keytab', 'mapreduce_keytab'];

    before(function() {
      var controller = App.KerberosWizardStep4Controller.create({
        wizardController: {
          getDBProperty: function() {
            return Em.A([
              Em.Object.create({ name: 'realm', value: 'realm_value' })
            ]);
          },
          loadCachedStepConfigValues: function() {
            return null;
          }
        }
      });
      sinon.stub(App.Service, 'find').returns(Em.A([
        { serviceName: 'HDFS' }
      ]));
      sinon.stub(App.configsCollection, 'getAll').returns([
        {
          name: 'hadoop.security.auth_to_local',
          displayType: 'multiLine'
        }
      ]);
      sinon.stub(App.router, 'get').withArgs('mainAdminKerberosController.isManualKerberos').returns(false);
      this.result = controller.prepareConfigProperties(properties);
    });

    after(function() {
      App.Service.find.restore();
      App.configsCollection.getAll.restore();
      App.router.get.restore();
    });

    it('should contains properties only for installed services', function() {
      expect(this.result.mapProperty('serviceName').uniq()).to.be.eql(['Cluster', 'HDFS']);
    });

    absentPropertiesTest.forEach(function(item) {
      it('property `{0}` should be absent'.format(item), function() {
        expect(this.result.findProperty('name', item)).to.be.undefined;
      });
    }, this);

    propertyValidationCases.forEach(function(test) {
      it('property {0} should be created'.format(test.property), function() {
        expect(this.result.findProperty('name', test.property)).to.be.ok;
      });
      test.e.forEach(function(expected) {
        it('property `{0}` should have `{1}` with value `{2}`'.format(test.property, expected.key, expected.value), function() {
          if (!!expected.absent) {
            expect(this.result.findProperty('name', test.property)).to.not.have.deep.property(expected.key);
          } else {
            expect(this.result.findProperty('name', test.property)).to.have.deep.property(expected.key, expected.value);
          }
        }, this);
      }, this);
    });
  });

  describe('#setStepConfigs', function() {
    describe('Add Service Wizard', function() {

      var properties = Em.A([
        Em.Object.create({ name: 'realm', value: '', serviceName: 'Cluster' }),
        Em.Object.create({ name: 'spnego_keytab', value: 'spnego_keytab_value', serviceName: 'Cluster', isEditable: true }),
        Em.Object.create({ name: 'hdfs_keytab', value: '', serviceName: 'HDFS', observesValueFrom: 'spnego_keytab', isEditable: true }),
        Em.Object.create({ name: 'falcon_keytab', value: 'falcon_keytab_value', serviceName: 'FALCON', isEditable: true }),
        Em.Object.create({ name: 'mapreduce_keytab', value: 'mapreduce_keytab_value', serviceName: 'MAPREDUCE2', isEditable: true })
      ]);

      var res;
      var controller;
      before(function() {
        sinon.stub(App.StackService, 'find').returns([
          Em.Object.create({
            serviceName: 'KERBEROS',
            configCategories: [],
            configTypeList: []
          }),
          Em.Object.create({
            serviceName: 'HDFS',
            configCategories: [],
            configTypeList: []
          }),
          Em.Object.create({
            serviceName: 'MAPREDUCE2',
            configTypeList: []
          })
        ]);
        sinon.stub(App.Service, 'find').returns([
          Em.Object.create({
            serviceName: 'HDFS'
          }),
          Em.Object.create({
            serviceName: 'KERBEROS'
          })
        ]);
        controller = App.KerberosWizardStep4Controller.create({
          selectedServiceNames: ['FALCON', 'MAPREDUCE2'],
          installedServiceNames: ['HDFS', 'KERBEROS'],
          wizardController: Em.Object.create({
            name: 'addServiceController',
            getDBProperty: function() {
              return Em.A([
                Em.Object.create({ name: 'realm', value: 'realm_value' })
              ]);
            },
            loadCachedStepConfigValues : function() {
              return null;
            }
          })
        });
        sinon.stub(App.router, 'get').withArgs('mainAdminKerberosController.isManualKerberos').returns(false);
        var stepConfigs = controller.setStepConfigs(properties);
        res = stepConfigs[0].get('configs').concat(stepConfigs[1].get('configs'));
      });

      Em.A([
        { name: 'spnego_keytab', e: false },
        { name: 'falcon_keytab', e: true },
        { name: 'hdfs_keytab', e: false },
        { name: 'mapreduce_keytab', e: true }
      ]).forEach(function(test) {
        it('Add Service: property `{0}` should be {1} editable'.format(test.name, !!test.e ? '' : 'not '), function() {
          expect(res.findProperty('name', test.name).get('isEditable')).to.eql(test.e);
        });
      });

      after(function() {
        controller.destroy();
        controller = null;
        App.StackService.find.restore();
        App.Service.find.restore();
        App.router.get.restore();
      });
    });
  });

  describe("#createCategoryForServices()", function() {
    var controller = App.KerberosWizardStep4Controller.create({
      wizardController: {
        name: 'addServiceController'
      }
    });
    beforeEach(function() {
      sinon.stub(App.Service, 'find').returns([
        Em.Object.create({
          serviceName: 'HDFS',
          displayName: 'HDFS'
        })
      ]);
      sinon.stub(App.StackService, 'find').returns([
        Em.Object.create({
          serviceName: 'HDFS',
          displayName: 'HDFS',
          isInstalled: true
        }),
        Em.Object.create({
          serviceName: 'MAPREDUCE2',
          displayName: 'MapReduce 2',
          isInstalled: false,
          isSelected: true
        })
      ]);
    });

    afterEach(function() {
      App.Service.find.restore();
      App.StackService.find.restore();
    });

    it('for add service', function() {
      expect(controller.createCategoryForServices()).to.eql([App.ServiceConfigCategory.create({ name: 'HDFS', displayName: 'HDFS', collapsedByDefault: true}),
        App.ServiceConfigCategory.create({ name: 'MAPREDUCE2', displayName: 'MapReduce 2', collapsedByDefault: true})]);
    });

    it('for kerberos wizard', function() {
      controller.set('wizardController.name', 'KerberosWizard');
      expect(controller.createCategoryForServices()).to.eql([App.ServiceConfigCategory.create({ name: 'HDFS', displayName: 'HDFS', collapsedByDefault: true})]);
    });
  });

  describe('#loadStep', function() {
    var controller;
    describe('skip "Configure Identities" step. ', function() {
      beforeEach(function() {
        controller = App.KerberosWizardStep4Controller.create({});
        this.wizardController = App.AddServiceController.create({});
        controller.set('wizardController', this.wizardController);
        sinon.stub(controller, 'clearStep').returns(true);
        sinon.stub(controller, 'getDescriptor').returns({ then: function() { return { always: function() {}}}});
        sinon.stub(controller, 'setStepConfigs').returns(true);
        sinon.stub(App.router, 'send').withArgs('next');
      });

      afterEach(function() {
        controller.clearStep.restore();

        controller.setStepConfigs.restore();
        App.router.send.restore();
      });

      var tests = [
        {
          securityEnabled: true,
          stepSkipped: false
        },
        {
          securityEnabled: false,
          stepSkipped: true
        }
      ];

      tests.forEach(function(test) {
        var message = 'Security {0} configure identities step should be {1}'.format(!!test.securityEnabled ? 'enabled' : 'disabled', !!test.stepSkipped ? 'skipped' : 'not skipped');
        describe(message, function() {

          beforeEach(function () {
            sinon.stub(App, 'get').withArgs('isKerberosEnabled').returns(test.securityEnabled);
            this.wizardController.checkSecurityStatus();
            controller.loadStep();
          });

          afterEach(function () {
            App.get.restore();
          });

          it('`send` is ' + (test.stepSkipped ? '' : 'not') + ' called with `next`', function () {
            expect(App.router.send.calledWith('next')).to.be.eql(test.stepSkipped);
          });

        });
      }, this);

      it('step should not be disabled for Add Kerberos wizard', function() {
        controller.set('wizardController', App.KerberosWizardController.create({}));
        controller.loadStep();
        expect(App.router.send.calledWith('next')).to.be.false;
      });
    });
  });

  describe('#mergeDescriptorToConfigurations', function() {
    var genAppConfigProperty = function(name, fileName, value) {
      return App.ServiceConfigProperty.create({
        name: name,
        filename: fileName,
        value: value
      });
    };

    var genPropertyCollection = function(configsList) {
      return configsList.map(function(i) {
        return genAppConfigProperty.apply(undefined, i);
      });
    };

    var genConfigType = function(fileName, properties) {
      var configTypeObj = {};
      configTypeObj.type = fileName;
      configTypeObj.properties = properties.reduce(function(p, _c) {
        p[_c[0]] = _c[1];
        return p;
      }, {});
      return configTypeObj;
    };

    var genConfigTypeCollection = function(coll) {
      return coll.map(function(i) {
        return genConfigType(i[0], i[1]);
      });
    };

    var cases = [
      {
        kerberosDescriptor: genPropertyCollection([]),
        configurations: [],
        e: [],
        m: 'should return empty array'
      },
      {
        kerberosDescriptor: genPropertyCollection([
          ['hadoop.proxy.group', 'hadoop-env', 'val1']
        ]),
        configurations: genConfigTypeCollection([
          ['hadoop-env', [
           ['hadoop.proxy.group', 'change_me'],
           ['hadoop.proxy', 'val2']
          ]],
          ['core-site', [
            ['hadoop.proxyuser.hcat.groups', '*']
          ]]
        ]),
        e: [
          {
            type: 'hadoop-env',
            properties: {
              'hadoop.proxy.group': 'val1',
              'hadoop.proxy': 'val2'
            }
          },
          {
            type: 'core-site',
            properties: {
              'hadoop.proxyuser.hcat.groups': '*'
            }
          }
        ],
        m: 'should change value of `hadoop.proxy.group`, rest object should not be changed.'
      },
      {
        kerberosDescriptor: genPropertyCollection([
          ['hadoop.proxy.group', 'hadoop-env', 'val1'],
          ['new_site_prop', 'core-site', 'new_val']
        ]),
        configurations: genConfigTypeCollection([
          ['hadoop-env', [
            ['hadoop.proxy.group', 'val1'],
            ['hadoop.proxy', 'val2']
          ]],
          ['core-site', [
            ['hadoop.proxyuser.hcat.groups', '*']
          ]]
        ]),
        e: [
          {
            type: 'hadoop-env',
            properties: {
              'hadoop.proxy.group': 'val1',
              'hadoop.proxy': 'val2'
            }
          },
          {
            type: 'core-site',
            properties: {
              'hadoop.proxyuser.hcat.groups': '*',
              'new_site_prop': 'new_val'
            }
          }
        ],
        m: 'should add property `new_site_prop` value to `core-site` file type, rest object should not be changed.'
      }
    ];

    cases.forEach(function(test) {
      it(test.m, function() {
        var toObj = function(res) {
          return JSON.parse(JSON.stringify(res));
        };
        expect(toObj(c.mergeDescriptorToConfigurations(test.configurations, test.kerberosDescriptor))).to.be.eql(test.e);
      });
    });
  });

  describe('#groupRecommendationProperties', function() {
    var cases, controller;
    beforeEach(function() {
      controller = App.KerberosWizardStep4Controller.create({});
    });

    afterEach(function() {
      controller.destroy();
      controller = null;
    });

    cases = [
      {
        recommendedConfigurations: {},
        servicesConfigurations: [],
        allConfigs: [],
        m: 'empty objects should not fail the code',
        e: {
          add: {},
          update: {},
          delete: {}
        }
      },
      {
        recommendedConfigurations: {
          'some-site': {
            properties: {
              // property absent from servicesConfigurations and allConfigs
              // should be added
              'new_prop1': 'val1',
              // property present in servicesConfigurations but absent in  allConfigs
              // should be skipped
              'new_prop2': 'val2',
              'existing-prop': 'updated_val2'
            },
            property_attributes: {
              'delete_prop1': {
                'delete': true
              }
            }
          }
        },
        servicesConfigurations: [
          {
            type: 'some-site',
            properties: {
              'existing-prop': 'val2',
              'new_prop2': 'val2'
            }
          }
        ],
        allConfigs: [
          Em.Object.create({ name: 'existing-prop', value: 'val3', filename: 'some-site'}),
          Em.Object.create({ name: 'delete_prop1', value: 'val', filename: 'some-site'})
        ],
        m: 'should add "new_prop1", remove "delete_prop1", skip adding "new_prop2" and update value for "existing-prop"',
        e: {
          update: {
            'some-site': {
              'existing-prop': 'updated_val2'
            }
          },
          add: {
            'some-site': {
              'new_prop1': 'val1'
            }
          },
          delete: {
            'some-site': {
              'delete_prop1': ''
            }
          }
        }
      }
    ];

    cases.forEach(function(test) {
      it(test.m, function() {
        expect(controller.groupRecommendationProperties(test.recommendedConfigurations, test.servicesConfigurations, test.allConfigs))
          .to.be.eql(test.e);
      });
    });
  });
});
