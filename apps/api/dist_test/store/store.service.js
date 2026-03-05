"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreService = void 0;
var common_1 = require("@nestjs/common");
var StoreService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var StoreService = _classThis = /** @class */ (function () {
        function StoreService_1(prisma, cloudinaryService) {
            this.prisma = prisma;
            this.cloudinaryService = cloudinaryService;
        }
        StoreService_1.prototype.createStore = function (userId, dto, logoFile) {
            return __awaiter(this, void 0, void 0, function () {
                var existingStore, linkExists, logo_url, uploadResult, store;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.sellerProfile.findUnique({
                                where: { user_id: userId },
                            })];
                        case 1:
                            existingStore = _a.sent();
                            if (existingStore) {
                                throw new common_1.ConflictException('You already have a store');
                            }
                            return [4 /*yield*/, this.prisma.sellerProfile.findUnique({
                                    where: { store_link: dto.store_link },
                                })];
                        case 2:
                            linkExists = _a.sent();
                            if (linkExists) {
                                throw new common_1.ConflictException('Store link is already taken');
                            }
                            logo_url = null;
                            if (!logoFile) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.cloudinaryService.uploadImage(logoFile, 'store-logos', { vectorize: true })];
                        case 3:
                            uploadResult = _a.sent();
                            logo_url = uploadResult.secure_url;
                            _a.label = 4;
                        case 4: return [4 /*yield*/, this.prisma.sellerProfile.create({
                                data: {
                                    user_id: userId,
                                    store_name: dto.store_name,
                                    store_link: dto.store_link,
                                    bio: dto.bio,
                                    whatsapp_number: dto.whatsapp_number,
                                    location: dto.location,
                                    delivery_policies: dto.delivery_policies,
                                    business_hours: dto.business_hours,
                                    social_links: dto.social_links || {},
                                    logo_url: logo_url,
                                },
                            })];
                        case 5:
                            store = _a.sent();
                            return [2 /*return*/, {
                                    message: 'Store created successfully',
                                    store: {
                                        id: store.id.toString(),
                                        store_name: store.store_name,
                                        store_link: store.store_link,
                                        logo_url: store.logo_url,
                                    },
                                }];
                    }
                });
            });
        };
        StoreService_1.prototype.updateStore = function (userId, dto, logoFile) {
            return __awaiter(this, void 0, void 0, function () {
                var store, data, uploadResult, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.sellerProfile.findUnique({
                                where: { user_id: userId },
                            })];
                        case 1:
                            store = _a.sent();
                            if (!store) {
                                throw new common_1.ConflictException('Store not found');
                            }
                            data = __assign({}, dto);
                            if (!logoFile) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.cloudinaryService.uploadImage(logoFile, 'store-logos', { vectorize: true })];
                        case 2:
                            uploadResult = _a.sent();
                            data.logo_url = uploadResult.secure_url;
                            _a.label = 3;
                        case 3: return [4 /*yield*/, this.prisma.sellerProfile.update({
                                where: { user_id: userId },
                                data: data,
                            })];
                        case 4:
                            updated = _a.sent();
                            return [2 /*return*/, {
                                    message: 'Store updated successfully',
                                    store: {
                                        id: updated.id.toString(),
                                        store_name: updated.store_name,
                                        store_link: updated.store_link,
                                        logo_url: updated.logo_url,
                                        bio: updated.bio,
                                        whatsapp_number: updated.whatsapp_number,
                                        location: updated.location,
                                        delivery_policies: updated.delivery_policies,
                                        business_hours: updated.business_hours,
                                        social_links: updated.social_links,
                                    },
                                }];
                    }
                });
            });
        };
        StoreService_1.prototype.getStoreStats = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var store, _a, productCount, orderItems, totalSales, uniqueOrders, recentOrders;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.sellerProfile.findUnique({
                                where: { user_id: userId },
                            })];
                        case 1:
                            store = _b.sent();
                            if (!store) {
                                throw new common_1.NotFoundException('Store not found');
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.product.count({
                                        where: { seller_id: store.id },
                                    }),
                                    this.prisma.orderItem.findMany({
                                        where: {
                                            product: {
                                                seller_id: store.id,
                                            },
                                        },
                                        include: {
                                            order: {
                                                include: {
                                                    buyer: {
                                                        select: {
                                                            full_name: true,
                                                        },
                                                    },
                                                },
                                            },
                                            product: {
                                                select: {
                                                    title: true,
                                                },
                                            },
                                        },
                                        orderBy: {
                                            order: {
                                                created_at: 'desc',
                                            },
                                        },
                                        take: 50, // Get last 50 items for aggregation
                                    }),
                                ])];
                        case 2:
                            _a = _b.sent(), productCount = _a[0], orderItems = _a[1];
                            totalSales = orderItems.reduce(function (acc, item) { return acc + Number(item.price) * item.quantity; }, 0);
                            uniqueOrders = Array.from(new Set(orderItems.map(function (item) { return item.order_id.toString(); })));
                            recentOrders = orderItems.slice(0, 5).map(function (item) { return ({
                                id: "#ORD-".concat(item.order_id.toString().slice(-4)),
                                customer: item.order.buyer.full_name,
                                product: item.product.title,
                                status: item.order.status,
                                amount: "GH\u20B5".concat((Number(item.price) * item.quantity).toLocaleString()),
                                date: item.order.created_at,
                            }); });
                            return [2 /*return*/, {
                                    stats: [
                                        {
                                            label: 'Total Sales',
                                            value: "GH\u20B5".concat(totalSales.toLocaleString()),
                                            change: '+0%',
                                            isPositive: true,
                                            icon: 'ShoppingBag',
                                            color: 'bg-emerald-500/10 text-emerald-500',
                                        },
                                        {
                                            label: 'Total Orders',
                                            value: uniqueOrders.length.toString(),
                                            change: '+0%',
                                            isPositive: true,
                                            icon: 'ShoppingBag',
                                            color: 'bg-blue-500/10 text-blue-500',
                                        },
                                        {
                                            label: 'Products',
                                            value: productCount.toString(),
                                            change: '0%',
                                            isPositive: true,
                                            icon: 'Package',
                                            color: 'bg-amber-500/10 text-amber-500',
                                        },
                                        {
                                            label: 'Store Views',
                                            value: '0', // Placeholder
                                            change: '0%',
                                            isPositive: true,
                                            icon: 'Users',
                                            color: 'bg-purple-500/10 text-purple-500',
                                        },
                                    ],
                                    recentOrders: recentOrders,
                                }];
                    }
                });
            });
        };
        return StoreService_1;
    }());
    __setFunctionName(_classThis, "StoreService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        StoreService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return StoreService = _classThis;
}();
exports.StoreService = StoreService;
