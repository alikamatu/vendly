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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var admin_query_dto_1 = require("./dto/admin-query.dto");
var AdminService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AdminService = _classThis = /** @class */ (function () {
        function AdminService_1(prisma) {
            this.prisma = prisma;
        }
        AdminService_1.prototype.getApprovals = function (query) {
            return __awaiter(this, void 0, void 0, function () {
                var page, limit, skip, where, term, _a, approvals, total;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            page = Math.max(1, parseInt(query.page || '1', 10));
                            limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10)));
                            skip = (page - 1) * limit;
                            where = {};
                            // Status filter
                            if (query.status && query.status !== admin_query_dto_1.ApprovalStatusFilter.ALL) {
                                where.status = query.status;
                            }
                            // Search filter (name or email)
                            if ((_b = query.search) === null || _b === void 0 ? void 0 : _b.trim()) {
                                term = query.search.trim();
                                where.user = {
                                    OR: [
                                        { full_name: { contains: term, mode: 'insensitive' } },
                                        { email: { contains: term, mode: 'insensitive' } },
                                    ],
                                };
                            }
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.adminApproval.findMany({
                                        where: where,
                                        orderBy: { created_at: 'desc' },
                                        skip: skip,
                                        take: limit,
                                        include: {
                                            user: {
                                                select: {
                                                    id: true,
                                                    full_name: true,
                                                    email: true,
                                                    school: true,
                                                    verification_doc: true,
                                                    created_at: true,
                                                },
                                            },
                                            reviewer: {
                                                select: {
                                                    id: true,
                                                    full_name: true,
                                                },
                                            },
                                        },
                                    }),
                                    this.prisma.adminApproval.count({ where: where }),
                                ])];
                        case 1:
                            _a = _c.sent(), approvals = _a[0], total = _a[1];
                            return [2 /*return*/, {
                                    data: approvals.map(function (a) { return ({
                                        id: a.id.toString(),
                                        user: {
                                            id: a.user.id.toString(),
                                            full_name: a.user.full_name,
                                            email: a.user.email,
                                            school: a.user.school,
                                            verification_doc: a.user.verification_doc,
                                            created_at: a.user.created_at,
                                        },
                                        status: a.status,
                                        reviewed_by: a.reviewer
                                            ? { id: a.reviewer.id.toString(), full_name: a.reviewer.full_name }
                                            : null,
                                        reviewed_at: a.reviewed_at,
                                        created_at: a.created_at,
                                    }); }),
                                    meta: {
                                        total: total,
                                        page: page,
                                        limit: limit,
                                        totalPages: Math.ceil(total / limit),
                                    },
                                }];
                    }
                });
            });
        };
        AdminService_1.prototype.getStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, total, pending, approved, rejected;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.prisma.adminApproval.count(),
                                this.prisma.adminApproval.count({ where: { status: client_1.ApprovalStatus.PENDING } }),
                                this.prisma.adminApproval.count({ where: { status: client_1.ApprovalStatus.APPROVED } }),
                                this.prisma.adminApproval.count({ where: { status: client_1.ApprovalStatus.REJECTED } }),
                            ])];
                        case 1:
                            _a = _b.sent(), total = _a[0], pending = _a[1], approved = _a[2], rejected = _a[3];
                            return [2 /*return*/, { total: total, pending: pending, approved: approved, rejected: rejected }];
                    }
                });
            });
        };
        AdminService_1.prototype.approveOrReject = function (approvalId, adminId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var approval, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.adminApproval.findUnique({
                                where: { id: approvalId },
                            })];
                        case 1:
                            approval = _a.sent();
                            if (!approval) {
                                throw new common_1.NotFoundException('Approval request not found');
                            }
                            if (approval.status !== client_1.ApprovalStatus.PENDING) {
                                throw new common_1.BadRequestException('This verification has already been reviewed');
                            }
                            return [4 /*yield*/, this.prisma.$transaction(__spreadArray([
                                    this.prisma.adminApproval.update({
                                        where: { id: approvalId },
                                        data: {
                                            status: dto.status,
                                            reviewed_by: adminId,
                                            reviewed_at: new Date(),
                                        },
                                    })
                                ], (dto.status === 'APPROVED'
                                    ? [
                                        this.prisma.user.update({
                                            where: { id: approval.user_id },
                                            data: { is_verified: true, role: client_1.Role.SELLER },
                                        }),
                                    ]
                                    : []), true))];
                        case 2:
                            updated = (_a.sent())[0];
                            return [2 /*return*/, {
                                    id: updated.id.toString(),
                                    status: updated.status,
                                    reviewed_at: updated.reviewed_at,
                                    message: "Verification ".concat(dto.status.toLowerCase(), " successfully"),
                                }];
                    }
                });
            });
        };
        return AdminService_1;
    }());
    __setFunctionName(_classThis, "AdminService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdminService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdminService = _classThis;
}();
exports.AdminService = AdminService;
