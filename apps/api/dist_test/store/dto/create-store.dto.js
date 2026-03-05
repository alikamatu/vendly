"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateStoreDto = void 0;
var class_validator_1 = require("class-validator");
var CreateStoreDto = function () {
    var _a;
    var _store_name_decorators;
    var _store_name_initializers = [];
    var _store_name_extraInitializers = [];
    var _store_link_decorators;
    var _store_link_initializers = [];
    var _store_link_extraInitializers = [];
    var _bio_decorators;
    var _bio_initializers = [];
    var _bio_extraInitializers = [];
    var _whatsapp_number_decorators;
    var _whatsapp_number_initializers = [];
    var _whatsapp_number_extraInitializers = [];
    var _location_decorators;
    var _location_initializers = [];
    var _location_extraInitializers = [];
    var _delivery_policies_decorators;
    var _delivery_policies_initializers = [];
    var _delivery_policies_extraInitializers = [];
    var _business_hours_decorators;
    var _business_hours_initializers = [];
    var _business_hours_extraInitializers = [];
    var _social_links_decorators;
    var _social_links_initializers = [];
    var _social_links_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateStoreDto() {
                this.store_name = __runInitializers(this, _store_name_initializers, void 0);
                this.store_link = (__runInitializers(this, _store_name_extraInitializers), __runInitializers(this, _store_link_initializers, void 0));
                this.bio = (__runInitializers(this, _store_link_extraInitializers), __runInitializers(this, _bio_initializers, void 0));
                this.whatsapp_number = (__runInitializers(this, _bio_extraInitializers), __runInitializers(this, _whatsapp_number_initializers, void 0));
                this.location = (__runInitializers(this, _whatsapp_number_extraInitializers), __runInitializers(this, _location_initializers, void 0));
                this.delivery_policies = (__runInitializers(this, _location_extraInitializers), __runInitializers(this, _delivery_policies_initializers, void 0));
                this.business_hours = (__runInitializers(this, _delivery_policies_extraInitializers), __runInitializers(this, _business_hours_initializers, void 0));
                this.social_links = (__runInitializers(this, _business_hours_extraInitializers), __runInitializers(this, _social_links_initializers, void 0));
                __runInitializers(this, _social_links_extraInitializers);
            }
            return CreateStoreDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _store_name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)()];
            _store_link_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsNotEmpty)(), (0, class_validator_1.Matches)(/^[a-z0-9-]+$/, {
                    message: 'Store link can only contain lowercase letters, numbers, and hyphens',
                })];
            _bio_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _whatsapp_number_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _location_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _delivery_policies_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _business_hours_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            _social_links_decorators = [(0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _store_name_decorators, { kind: "field", name: "store_name", static: false, private: false, access: { has: function (obj) { return "store_name" in obj; }, get: function (obj) { return obj.store_name; }, set: function (obj, value) { obj.store_name = value; } }, metadata: _metadata }, _store_name_initializers, _store_name_extraInitializers);
            __esDecorate(null, null, _store_link_decorators, { kind: "field", name: "store_link", static: false, private: false, access: { has: function (obj) { return "store_link" in obj; }, get: function (obj) { return obj.store_link; }, set: function (obj, value) { obj.store_link = value; } }, metadata: _metadata }, _store_link_initializers, _store_link_extraInitializers);
            __esDecorate(null, null, _bio_decorators, { kind: "field", name: "bio", static: false, private: false, access: { has: function (obj) { return "bio" in obj; }, get: function (obj) { return obj.bio; }, set: function (obj, value) { obj.bio = value; } }, metadata: _metadata }, _bio_initializers, _bio_extraInitializers);
            __esDecorate(null, null, _whatsapp_number_decorators, { kind: "field", name: "whatsapp_number", static: false, private: false, access: { has: function (obj) { return "whatsapp_number" in obj; }, get: function (obj) { return obj.whatsapp_number; }, set: function (obj, value) { obj.whatsapp_number = value; } }, metadata: _metadata }, _whatsapp_number_initializers, _whatsapp_number_extraInitializers);
            __esDecorate(null, null, _location_decorators, { kind: "field", name: "location", static: false, private: false, access: { has: function (obj) { return "location" in obj; }, get: function (obj) { return obj.location; }, set: function (obj, value) { obj.location = value; } }, metadata: _metadata }, _location_initializers, _location_extraInitializers);
            __esDecorate(null, null, _delivery_policies_decorators, { kind: "field", name: "delivery_policies", static: false, private: false, access: { has: function (obj) { return "delivery_policies" in obj; }, get: function (obj) { return obj.delivery_policies; }, set: function (obj, value) { obj.delivery_policies = value; } }, metadata: _metadata }, _delivery_policies_initializers, _delivery_policies_extraInitializers);
            __esDecorate(null, null, _business_hours_decorators, { kind: "field", name: "business_hours", static: false, private: false, access: { has: function (obj) { return "business_hours" in obj; }, get: function (obj) { return obj.business_hours; }, set: function (obj, value) { obj.business_hours = value; } }, metadata: _metadata }, _business_hours_initializers, _business_hours_extraInitializers);
            __esDecorate(null, null, _social_links_decorators, { kind: "field", name: "social_links", static: false, private: false, access: { has: function (obj) { return "social_links" in obj; }, get: function (obj) { return obj.social_links; }, set: function (obj, value) { obj.social_links = value; } }, metadata: _metadata }, _social_links_initializers, _social_links_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateStoreDto = CreateStoreDto;
