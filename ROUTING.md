# 路由访问说明

## 动态路由访问方式

### 当前路由配置

```typescript
// 路由 1: 信息页面
path: '/:roomId'
// 访问: http://域名/房间ID

// 路由 2: 会议室页面  
path: '/:roomId/meet'
// 访问: http://域名/房间ID/meet
```

### 访问示例

假设你的域名是 `http://oztf.site`，房间ID是 `959-6034-7377`：

#### ✅ 正确访问方式

1. **访问信息页面**（输入昵称页面）
   ```
   http://oztf.site/959-6034-7377
   ```
   - 这会匹配路由 `/:roomId`
   - `roomId` 参数值 = `959-6034-7377`

2. **访问会议室页面**（音视频通话页面）
   ```
   http://oztf.site/959-6034-7377/meet
   ```
   - 这会匹配路由 `/:roomId/meet`
   - `roomId` 参数值 = `959-6034-7377`

#### ❌ 错误访问方式

```
http://oztf.site/roomId          ❌ 错误：roomId 会被当作字面值
http://oztf.site/:roomId          ❌ 错误：:roomId 会被当作字面值
http://oztf.site/959-6034-7377/  ✅ 可以（末尾斜杠会被忽略）
```

### 路由参数获取

在组件中获取路由参数：

```typescript
import { useRoute } from 'vue-router';

const route = useRoute();
const roomId = route.params.roomId as string;
// roomId 的值就是 URL 中的房间ID，例如 "959-6034-7377"
```

### 路由跳转

在代码中进行路由跳转：

```typescript
import { useRouter } from 'vue-router';

const router = useRouter();

// 跳转到信息页面
router.push(`/${roomId}`);

// 跳转到会议室页面
router.push(`/${roomId}/meet`);
```

## 常见问题

### 1. 访问 `/:roomId` 显示 404

**原因**：服务器没有配置 SPA 路由支持

**解决**：配置 Nginx/Apache 将所有路由指向 `index.html`

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 2. 刷新页面后 404

**原因**：同上，服务器配置问题

**解决**：确保服务器配置了 `try_files` 或 `mod_rewrite`

### 3. 路由参数获取不到

**检查**：
- URL 是否正确（例如：`/959-6034-7377` 而不是 `/roomId`）
- 组件中是否正确使用 `route.params.roomId`

### 4. 路由匹配错误

**注意**：路由匹配是按顺序的，更具体的路由应该放在前面

当前配置是正确的：
```typescript
routes: [
    { path: '/:roomId/meet', ... },  // 更具体的路由
    { path: '/:roomId', ... }        // 更通用的路由
]
```

## 完整访问流程示例

1. **用户访问信息页面**
   ```
   访问: http://oztf.site/959-6034-7377
   → 匹配路由: /:roomId
   → 显示: InfoPage 组件
   → 用户输入昵称，点击"进入会议室"
   ```

2. **跳转到会议室**
   ```
   代码执行: router.push('/959-6034-7377/meet')
   → 匹配路由: /:roomId/meet
   → 显示: MeetRoom 组件
   → 开始音视频通话
   ```

## 测试路由

### 本地测试

```bash
# 启动开发服务器
pnpm run dev

# 访问
http://localhost:3000/959-6034-7377
http://localhost:3000/959-6034-7377/meet
```

### 生产环境测试

```
http://oztf.site/959-6034-7377
http://oztf.site/959-6034-7377/meet
```

## 路由参数格式

根据 `roomId.ts` 文件，房间ID格式应该是：
- 格式：`xxx-xxxx-xxxx`（例如：`959-6034-7377`）
- 如果格式不正确，路由会匹配但可能会在组件中报错
