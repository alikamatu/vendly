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
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
var bcrypt = require("bcrypt");
var crypto_1 = require("crypto");
var AuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthService = _classThis = /** @class */ (function () {
        function AuthService_1(prisma, jwtService, configService, emailService) {
            this.prisma = prisma;
            this.jwtService = jwtService;
            this.configService = configService;
            this.emailService = emailService;
            // In-memory token blacklist (use Redis in production)
            this.tokenBlacklist = new Set();
        }
        AuthService_1.prototype.register = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, hashedPassword, verificationToken, verificationExpires, user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { email: dto.email },
                            })];
                        case 1:
                            existing = _a.sent();
                            if (existing) {
                                throw new common_1.ConflictException('A user with this email already exists');
                            }
                            return [4 /*yield*/, bcrypt.hash(dto.password, 10)];
                        case 2:
                            hashedPassword = _a.sent();
                            verificationToken = (0, crypto_1.randomBytes)(32).toString('hex');
                            verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
                            return [4 /*yield*/, this.prisma.user.create({
                                    data: {
                                        full_name: dto.full_name,
                                        email: dto.email,
                                        password_hash: hashedPassword,
                                        school: dto.school,
                                        email_verification_token: verificationToken,
                                        email_verification_expires: verificationExpires,
                                    },
                                })];
                        case 3:
                            user = _a.sent();
                            this.emailService.sendVerificationEmail(user.email, verificationToken).catch(function (err) {
                                console.error('Failed to send verification email', err);
                            });
                            return [2 /*return*/, {
                                    message: 'Registration successful. Please check your email to verify your account.',
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.login = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, passwordValid, payload, latestApproval;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { email: dto.email },
                                include: {
                                    seller_profile: true,
                                    admin_approvals: {
                                        orderBy: { created_at: 'desc' },
                                        take: 1,
                                    },
                                },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('Invalid email or password');
                            }
                            return [4 /*yield*/, bcrypt.compare(dto.password, user.password_hash)];
                        case 2:
                            passwordValid = _a.sent();
                            if (!passwordValid) {
                                throw new common_1.UnauthorizedException('Invalid email or password');
                            }
                            if (!user.is_verified) {
                                throw new common_1.UnauthorizedException('Please verify your email before logging in');
                            }
                            payload = { sub: user.id.toString(), email: user.email, role: user.role };
                            latestApproval = user.admin_approvals[0] || null;
                            return [2 /*return*/, {
                                    access_token: this.jwtService.sign(payload),
                                    user: {
                                        id: user.id.toString(),
                                        full_name: user.full_name,
                                        email: user.email,
                                        role: user.role,
                                        is_verified: user.is_verified,
                                        approval_status: (latestApproval === null || latestApproval === void 0 ? void 0 : latestApproval.status) || null,
                                        has_verification_doc: !!user.verification_doc,
                                        seller_profile: user.seller_profile
                                            ? {
                                                id: user.seller_profile.id.toString(),
                                                store_name: user.seller_profile.store_name,
                                                store_link: user.seller_profile.store_link,
                                                bio: user.seller_profile.bio,
                                                logo_url: user.seller_profile.logo_url,
                                            }
                                            : null,
                                    },
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.getMe = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var user, latestApproval;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                                include: {
                                    seller_profile: true,
                                    admin_approvals: {
                                        orderBy: { created_at: 'desc' },
                                        take: 1,
                                    },
                                },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.NotFoundException('User not found');
                            }
                            latestApproval = user.admin_approvals[0] || null;
                            return [2 /*return*/, {
                                    id: user.id.toString(),
                                    full_name: user.full_name,
                                    email: user.email,
                                    school: user.school,
                                    role: user.role,
                                    is_verified: user.is_verified,
                                    has_verification_doc: !!user.verification_doc,
                                    approval_status: (latestApproval === null || latestApproval === void 0 ? void 0 : latestApproval.status) || null,
                                    seller_profile: user.seller_profile
                                        ? {
                                            id: user.seller_profile.id.toString(),
                                            store_name: user.seller_profile.store_name,
                                            store_link: user.seller_profile.store_link,
                                            bio: user.seller_profile.bio,
                                            logo_url: user.seller_profile.logo_url,
                                        }
                                        : null,
                                    created_at: user.created_at,
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.submitVerification = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, latestApproval;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                                include: {
                                    admin_approvals: {
                                        orderBy: { created_at: 'desc' },
                                        take: 1,
                                    },
                                },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.NotFoundException('User not found');
                            }
                            if (!user.is_verified) {
                                throw new common_1.BadRequestException('Please verify your email first');
                            }
                            latestApproval = user.admin_approvals[0];
                            if (latestApproval && latestApproval.status === 'PENDING') {
                                throw new common_1.BadRequestException('You already have a pending verification request');
                            }
                            // Update user's verification doc and create approval record
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.user.update({
                                        where: { id: userId },
                                        data: { verification_doc: dto.verification_doc },
                                    }),
                                    this.prisma.adminApproval.create({
                                        data: {
                                            user_id: userId,
                                            status: 'PENDING',
                                        },
                                    }),
                                ])];
                        case 2:
                            // Update user's verification doc and create approval record
                            _a.sent();
                            return [2 /*return*/, { message: 'Verification request submitted successfully. An admin will review your submission.' }];
                    }
                });
            });
        };
        AuthService_1.prototype.getApprovalStatus = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var approval;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.adminApproval.findFirst({
                                where: { user_id: userId },
                                orderBy: { created_at: 'desc' },
                            })];
                        case 1:
                            approval = _a.sent();
                            return [2 /*return*/, {
                                    status: (approval === null || approval === void 0 ? void 0 : approval.status) || null,
                                    reviewed_at: (approval === null || approval === void 0 ? void 0 : approval.reviewed_at) || null,
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.verifyEmail = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findFirst({
                                where: {
                                    email_verification_token: dto.token,
                                    email_verification_expires: { gt: new Date() },
                                },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.BadRequestException('Invalid or expired verification token');
                            }
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: user.id },
                                    data: {
                                        is_verified: true,
                                        email_verification_token: null,
                                        email_verification_expires: null,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Email verified successfully. You can now log in.' }];
                    }
                });
            });
        };
        AuthService_1.prototype.forgotPassword = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, resetToken, resetExpires;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { email: dto.email },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                return [2 /*return*/, { message: 'If a user with that email exists, a password reset link has been sent.' }];
                            }
                            resetToken = (0, crypto_1.randomBytes)(32).toString('hex');
                            resetExpires = new Date(Date.now() + 60 * 60 * 1000);
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: user.id },
                                    data: {
                                        password_reset_token: resetToken,
                                        password_reset_expires: resetExpires,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            this.emailService.sendPasswordResetEmail(user.email, resetToken).catch(console.error);
                            return [2 /*return*/, { message: 'If a user with that email exists, a password reset link has been sent.' }];
                    }
                });
            });
        };
        AuthService_1.prototype.resetPassword = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, hashedPassword;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findFirst({
                                where: {
                                    password_reset_token: dto.token,
                                    password_reset_expires: { gt: new Date() },
                                },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.BadRequestException('Invalid or expired password reset token');
                            }
                            return [4 /*yield*/, bcrypt.hash(dto.newPassword, 10)];
                        case 2:
                            hashedPassword = _a.sent();
                            return [4 /*yield*/, this.prisma.user.update({
                                    where: { id: user.id },
                                    data: {
                                        password_hash: hashedPassword,
                                        password_reset_token: null,
                                        password_reset_expires: null,
                                    },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { message: 'Password reset successful. You can now log in with your new password.' }];
                    }
                });
            });
        };
        AuthService_1.prototype.logout = function (token) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.tokenBlacklist.add(token);
                    return [2 /*return*/, { message: 'Logged out successfully' }];
                });
            });
        };
        AuthService_1.prototype.updateProfile = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, data, existing, isMatch, _a, updated;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                            })];
                        case 1:
                            user = _b.sent();
                            if (!user) {
                                throw new common_1.NotFoundException('User not found');
                            }
                            data = {};
                            if (dto.full_name)
                                data.full_name = dto.full_name;
                            if (!(dto.email && dto.email !== user.email)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.user.findUnique({ where: { email: dto.email } })];
                        case 2:
                            existing = _b.sent();
                            if (existing)
                                throw new common_1.ConflictException('Email already in use');
                            data.email = dto.email;
                            _b.label = 3;
                        case 3:
                            if (!dto.new_password) return [3 /*break*/, 6];
                            if (!dto.current_password) {
                                throw new common_1.BadRequestException('Current password is required to set a new one');
                            }
                            return [4 /*yield*/, bcrypt.compare(dto.current_password, user.password_hash)];
                        case 4:
                            isMatch = _b.sent();
                            if (!isMatch)
                                throw new common_1.UnauthorizedException('Invalid current password');
                            _a = data;
                            return [4 /*yield*/, bcrypt.hash(dto.new_password, 10)];
                        case 5:
                            _a.password_hash = _b.sent();
                            _b.label = 6;
                        case 6: return [4 /*yield*/, this.prisma.user.update({
                                where: { id: userId },
                                data: data,
                            })];
                        case 7:
                            updated = _b.sent();
                            return [2 /*return*/, {
                                    message: 'Profile updated successfully',
                                    user: {
                                        id: updated.id.toString(),
                                        full_name: updated.full_name,
                                        email: updated.email,
                                    },
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.isTokenBlacklisted = function (token) {
            return this.tokenBlacklist.has(token);
        };
        return AuthService_1;
    }());
    __setFunctionName(_classThis, "AuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
}();
exports.AuthService = AuthService;
