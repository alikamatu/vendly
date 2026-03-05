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
exports.ProductService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var Decimal = client_1.Prisma.Decimal;
var ProductService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ProductService = _classThis = /** @class */ (function () {
        function ProductService_1(prisma, cloudinaryService) {
            this.prisma = prisma;
            this.cloudinaryService = cloudinaryService;
        }
        ProductService_1.prototype.createProduct = function (userId, dto, images, video) {
            return __awaiter(this, void 0, void 0, function () {
                var seller, image_urls, _i, images_1, file, uploadResult, video_url, MAX_VIDEO_BYTES, videoResult, err_1, message, duration, parsedAttributes, product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.sellerProfile.findUnique({
                                where: { user_id: userId },
                            })];
                        case 1:
                            seller = _a.sent();
                            if (!seller) {
                                throw new common_1.NotFoundException('Seller profile not found. Please create a store first.');
                            }
                            // 2. Upload images to Cloudinary (Max 3)
                            if (images.length > 3) {
                                throw new common_1.BadRequestException('Maximum 3 images allowed');
                            }
                            image_urls = [];
                            _i = 0, images_1 = images;
                            _a.label = 2;
                        case 2:
                            if (!(_i < images_1.length)) return [3 /*break*/, 5];
                            file = images_1[_i];
                            return [4 /*yield*/, this.cloudinaryService.uploadImage(file, 'products', { quality: 'auto' })];
                        case 3:
                            uploadResult = _a.sent();
                            image_urls.push(uploadResult.secure_url);
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5:
                            if (!video) return [3 /*break*/, 10];
                            MAX_VIDEO_BYTES = 15 * 1024 * 1024;
                            if (video.size > MAX_VIDEO_BYTES) {
                                throw new common_1.BadRequestException('Product video is too large. Please upload a short clip (max ~5 seconds).');
                            }
                            videoResult = void 0;
                            _a.label = 6;
                        case 6:
                            _a.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, this.cloudinaryService.uploadVideo(video, 'products')];
                        case 7:
                            videoResult = _a.sent();
                            return [3 /*break*/, 9];
                        case 8:
                            err_1 = _a.sent();
                            message = (err_1 && err_1.message) || '';
                            if (message.toLowerCase().includes('file size too large') || message.toLowerCase().includes('timeout')) {
                                throw new common_1.BadRequestException('Product video is too long or too large. Please upload a clip up to 5 seconds.');
                            }
                            throw err_1;
                        case 9:
                            duration = videoResult.duration;
                            if (typeof duration === 'number' && duration > 5.1) {
                                throw new common_1.BadRequestException('Product video must be 5 seconds or less.');
                            }
                            video_url = videoResult.secure_url;
                            _a.label = 10;
                        case 10:
                            parsedAttributes = {};
                            if (dto.attributes) {
                                try {
                                    parsedAttributes = typeof dto.attributes === 'string' ? JSON.parse(dto.attributes) : dto.attributes;
                                }
                                catch (err) {
                                    console.warn('Failed to parse product attributes', err);
                                }
                            }
                            return [4 /*yield*/, this.prisma.product.create({
                                    data: {
                                        seller_id: seller.id,
                                        title: dto.title,
                                        description: dto.description,
                                        price: new Decimal(dto.price),
                                        currency: dto.currency || 'GHS',
                                        condition: dto.condition || 'new',
                                        quantity_available: dto.quantity_available ? parseInt(dto.quantity_available, 10) : 1,
                                        status: dto.status || 'draft',
                                        category: dto.category,
                                        image_urls: image_urls,
                                        video_url: video_url,
                                        tags: dto.tags || [],
                                        attributes: parsedAttributes,
                                    },
                                })];
                        case 11:
                            product = _a.sent();
                            return [2 /*return*/, {
                                    message: 'Product created successfully',
                                    product: {
                                        id: product.id.toString(),
                                        title: product.title,
                                        price: product.price.toString(),
                                        image_urls: product.image_urls,
                                    },
                                }];
                    }
                });
            });
        };
        ProductService_1.prototype.getProducts = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.product.findMany({
                            include: {
                                seller: {
                                    select: {
                                        store_name: true,
                                        logo_url: true,
                                        store_link: true,
                                    }
                                }
                            },
                            orderBy: {
                                created_at: 'desc',
                            }
                        })];
                });
            });
        };
        ProductService_1.prototype.getProductById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.product.findUnique({
                                where: { id: id },
                                include: {
                                    seller: {
                                        select: {
                                            store_name: true,
                                            logo_url: true,
                                            store_link: true,
                                            bio: true,
                                        }
                                    }
                                }
                            })];
                        case 1:
                            product = _a.sent();
                            if (!product) {
                                throw new common_1.NotFoundException('Product not found');
                            }
                            return [2 /*return*/, product];
                    }
                });
            });
        };
        ProductService_1.prototype.getCategories = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.category.findMany({
                            select: {
                                id: true,
                                name: true,
                                fields: true,
                            },
                        })];
                });
            });
        };
        return ProductService_1;
    }());
    __setFunctionName(_classThis, "ProductService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProductService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProductService = _classThis;
}();
exports.ProductService = ProductService;
