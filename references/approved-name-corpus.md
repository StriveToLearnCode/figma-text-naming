# Figma 特效文本历史命名样本

本表从仓库内历史 `page-center-config.request.json` 的 `text` 配置中提取，用于为 Figma 特效文本命名提供真实先例。

筛选口径：

- 只保留含动态占位符的文本条目。
- 每个 Key 只保留一条样本。
- Key、文案、大小写、占位符和历史拼写保持原样。
- “原配置中文说明”来自原条目的 `describe`，不是 AI 生成的翻译。
- 排除 HTML 富文本、空说明以及带 `TODO`、`CUSTOMIZE` 等未完成标记的条目。

| 序号 | 历史 Key | 原始动态文案 | 原配置中文说明 | 来源 |
| --- | --- | --- | --- | --- |
| 001 | `winners/burst-coin` | `爆出\n{{coin}}金幣` | 百倍返金中奖展示文案，{{coin}}=金币数 | `apps/long/millionaire-c/pages-C/main/docs/page-center/page-center-config.request.json` |
| 002 | `gift/remain-count` | `差{{count}}個` | 礼物点亮还差个数，{{count}}=剩余个数 | `apps/long/millionaire-c/pages-C/main/docs/page-center/page-center-config.request.json` |
| 003 | `team/contribution` | `貢獻比例：{{}}` | 组队成员贡献比例，占位符=贡献占比 | `apps/long/millionaire-c/pages-C/main/docs/page-center/page-center-config.request.json` |
| 004 | `team/recv-invitation` | `「{{}}」邀請你一起組隊` | 收到组队邀请弹窗文案 | `apps/long/millionaire-c/pages-C/main/docs/page-center/page-center-config.request.json` |
| 005 | `team/agree-confirm` | `確認和「{{}}」組隊嗎？` | 接受邀请二次确认文案 | `apps/long/millionaire-c/pages-C/main/docs/page-center/page-center-config.request.json` |
| 006 | `team/reject-confirm` | `確定拒絕「{{}}」的組隊邀請嗎？` | 拒绝邀请二次确认文案 | `apps/long/millionaire-c/pages-C/main/docs/page-center/page-center-config.request.json` |
| 007 | `toast/team-full` | `{{name}}的隊伍已經滿員，看看其他人的隊伍吧！` | 扫码申请队伍满员，{{name}}=昵称 | `apps/long/millionaire-c/pages-C/main/docs/page-center/page-center-config.request.json` |
| 008 | `txt/num` | `x{{}}` | 霓虹灯碎片数量 | `apps/mdc/7076/docs/page-center/page-center-config.request.json` |
| 009 | `dialog/current-num` | `当前拥有：{{}}` | 宝藏弹窗当前拥有碎片数量 | `apps/mdc/7104/docs/page-center/page-center-config.request.json` |
| 010 | `txt/count-outer` | `浅礁：{{}}人` | 外圈累计进入人数 | `apps/mdc/7104/docs/page-center/page-center-config.request.json` |
| 011 | `txt/count-middle` | `近海：{{}}人` | 中圈累计进入人数 | `apps/mdc/7104/docs/page-center/page-center-config.request.json` |
| 012 | `txt/count-inner` | `深海：{{}}人` | 内圈累计进入人数 | `apps/mdc/7104/docs/page-center/page-center-config.request.json` |
| 013 | `ring/title-duration` | `{{0}}日` | 称号时长，{{0}}=天数 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 014 | `marry/propose-main` | `守護値が【{{0}}】に達するとプロポーズ可能` | 求婚门槛主文案，{{0}}=守护值 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 015 | `marry/heat-main` | `熱度が{{0}}に達すると全サーバー弾幕祝福を獲得` | 婚礼房热度主文案，{{0}}=阈值 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 016 | `fountain/guarantee-progress` | `ぬいぐるみ保底まで {{0}}/{{1}}` | 保底进度，{{0}}=当前 {{1}}=总数 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 017 | `fountain/banner-tip` | `累計{{0}}回開封で七夕限定ぬいぐるみBOX確定！` | 盲盒保底提示，{{0}}=保底次数 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 018 | `fountain/chip-balance` | `×{{0}}` | 愿恋石余额，{{0}}=数量 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 019 | `lottery/confirm-enough` | `願恋石を{{0}}個使って{{1}}回告白しますか？` | 抽奖二次确认充足态，{{0}}=愿恋石 {{1}}=次数 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 020 | `lottery/confirm-lack` | `願恋石が不足！{{0}}金币で{{1}}個購入して続けますか？` | 抽奖二次确认不足态，{{0}}=金币 {{1}}=愿恋石 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 021 | `lottery/guarantee-desc` | `第{{0}}回で指輪ギフトカード確定` | 奖池保底说明，{{0}}=保底次数 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 022 | `buychip/tier-num` | `願恋石×{{0}}` | 愿恋石档位数量，{{0}}=数量 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 023 | `buychip/tier-coin` | `{{0}}金币` | 愿恋石档位金币，{{0}}=金币 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 024 | `buychip/confirm` | `{{0}}金币で願恋石{{1}}個を購入しますか？` | 购买确认，{{0}}=金币 {{1}}=愿恋石 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 025 | `buychip/success` | `願恋石×{{0}} を獲得しました` | 购买成功，{{0}}=数量 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 026 | `sign/day-count` | `{{0}}日目` | 签到日，{{0}}=第几天 | `apps/short/20260604-act6961/pages-J/main/docs/page-center/page-center-config.request.json` |
| 027 | `question/progress-count` | `問題-{{current}}` | 答题进度（中:问题-{{current}}） | `apps/short/20260604-act6962/pages-J/content/main/docs/page-center/page-center-config.request.json` |
| 028 | `vote/remaining-count` | `{{count}}回` | 剩余投票次数（{{count}}=remaining_votes） | `apps/short/20260604-act6962/pages-J/content/main/docs/page-center/page-center-config.request.json` |
| 029 | `ranking/consistency-percent` | `{{percent}}%` | 一致度百分比（{{percent}}=consistency） | `apps/short/20260604-act6962/pages-J/content/main/docs/page-center/page-center-config.request.json` |
| 030 | `ranking/voter-count` | `{{count}}人があなたを評価しました` | 评价人数（{{count}}=total_voters） | `apps/short/20260604-act6962/pages-J/content/main/docs/page-center/page-center-config.request.json` |
| 031 | `ranking/top-vote-count` | `{{count}}票` | top3 票数（{{count}}=vote_count） | `apps/short/20260604-act6962/pages-J/content/main/docs/page-center/page-center-config.request.json` |
| 032 | `dialog/retest-confirm` | `再診断には{{cost}}コインが必要です。もう一度診断しますか？` | 重答二次确认（已答过 test_count>0 时弹，不判断 is_unlocked），{{cost}}=mainConfig.retestCost（兜底100） | `apps/short/20260604-act6962/pages-J/content/main/docs/page-center/page-center-config.request.json` |
| 033 | `dialog/unlock-confirm` | `詳細解説のロック解除に{{cost}}コインが必要です。よろしいですか？` | 解锁详细解说二次确认，{{cost}}=mainConfig.unlockCost（兜底100） | `apps/short/20260604-act6962/pages-J/content/main/docs/page-center/page-center-config.request.json` |
| 034 | `stage/people-count` | `{{0}}：{{1}}人` | 圈层人数轮播（圈层名/人数） | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 035 | `broadcast/reward` | `恭喜{{0}}获得金币奖池` | 进圈弹幕-行1获奖（外圈金币奖池获奖者，{{0}}昵称） | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 036 | `broadcast/middle` | `恭喜{{0}}进入中圈` | 进圈弹幕-行2进圈（中圈用户，{{0}}昵称） | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 037 | `broadcast/inner` | `恭喜{{0}}进入内圈` | 进圈弹幕-行2进圈（内圈用户，{{0}}昵称） | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 038 | `like/left` | `今日剩余点赞 {{0}} 次` | 点赞带剩余次数 | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 039 | `guarantee/text` | `保底：再送 {{0}} 个必进入{{1}}` | 保底文案（狼爪数/下一圈） | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 040 | `stage/progress` | `距离下一次领奖还需消耗：{{0}}狼爪` | 阶段进度条文案 | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 041 | `coin/balance` | `{{0}}` | 狼爪余额 | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 042 | `reward/ring-share-coin` | `分享成功获得{{0}}代币` | 戒指分享得代币 | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 043 | `buy-confirm/text` | `是否消耗{{0}}金币购买{{1}}个抽奖币，并抽奖{{2}}次？` | 购买确认文案（金币/抽奖币/次数） | `apps/short/20260605-a/pages-A/game/main/docs/page-center/page-center-config.request.json` |
| 044 | `coinPool/share-count` | `瓜分次数 {{0}}` | 头像左上角瓜分次数（410:31880），{{0}}=次数 | `apps/short/20260605-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 045 | `level/remain-time` | `剩余时间：{{}}` | 名人等级卡片倒计时 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 046 | `level/current-identity` | `当前身份：{{}}` | 当前名人等级 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 047 | `level/remaining-fame` | `距离{{}}还差：{{}}` | 距下一等级名人值 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 048 | `level/fame-value` | `名人值：{{}}` | 当前名人值展示 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 049 | `level/seat-status` | `席位状态：{{}}` | 席位状态前缀 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 050 | `level/founder-rank` | `创始排名：第{{}}名` | 第一阶段创始排名 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 051 | `founder/seat-got` | `لقد حصلت على: المقعد NO.{{}}` | 已入创始席提示 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 052 | `founder/seat-no` | `NO.{{}}` | 创始席编号 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 053 | `tab1/seat-no` | `NO:{{}}` | 创始席大圈左下编号 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 054 | `tab1/time-text` | `{{}}` | 创始席倒计时数字 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 055 | `founder/seat-countdown` | `{{}}:{{}}:{{}}:{{}}d` | 创始席区倒计时 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 056 | `founder/first-seat-count` | `أول 20 مقعد: {{}}/{{}}` | 前20席占用 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 057 | `tab1/screen_tips` | `حصل {{}} على {{}} ماسة` | 创始席钻石飘屏文案：昵称、钻石数量 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 058 | `founder/current-rank` | `الترتيب الحالي: {{}}` | 当前创始排名 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 059 | `founder/last30-rank` | `مرتبة آخر 30 مقعد: {{}}` | 荣耀30席排名 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 060 | `founder/seat-identity-info` | `رقم المقعد: NO.{{}} \| الهوية الحالية: {{}}` | 入席后展示席位编号与当前身份 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 061 | `treasure/key-count` | `{{count}}` | 宝库钥匙数量 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 062 | `tab1/prop-name` | `{{}}` | 印记争夺奖励道具名称 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 063 | `mark/my-rank` | `第{{rank}}名` | 印记榜排名 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 064 | `mark/my-keys` | `今日钥匙：{{count}}` | 印记榜钥匙 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 065 | `record/mark-battle-rank` | `الترتيب: {{}}` | 印记争夺记录第三列-排名 lottery_status | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 066 | `support/my-value` | `助威值：{{value}}` | 助威值余额 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 067 | `tab2/level_remain_time` | `{{}}:{{}}:{{}}:{{}}d` | Tab2家族头区倒计时 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 068 | `tab2/level_daily_score` | `نقاط القبيلة اليوم: {{}}` | 今日家族分 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 069 | `tab2/level_daily_rank` | `مرتبة القبيلة اليوم: {{}}` | 今日家族排名 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 070 | `tab2/level_bonus` | `مضاعفة نقاط القبيلة: {{}} ضعف` | 家族加成倍率 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 071 | `lottery/confirm` | `确认花费{{}}个抽奖币抽奖{{}}次吗？` | 抽奖二次确认 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 072 | `lottery/chipShort` | `确认花费{{}}金币购买{{}}个抽奖币继续抽奖吗？` | 碎片不足自动购买确认 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 073 | `broadcast/text` | `{{}}获得了{{}}` | 弹幕文案 | `apps/short/20260607-act6996/pages-O/main/docs/page-center/page-center-config.request.json` |
| 074 | `txt/buy` | `已购{{0}}/{{1}}` | 礼包购买次数，{{0}}=已购，{{1}}=限购 | `apps/short/20260611-jk/pages-O/main/docs/page-center/page-center-config.request.json` |
| 075 | `reward/count` | `×{{0}}` | 奖励数量，{{0}} 为数量 | `apps/short/20260611-jk/pages-O/main/docs/page-center/page-center-config.request.json` |
| 076 | `reward/name` | `{{0}}` | 奖励名称，{{0}} 为名称 | `apps/short/20260611-jk/pages-O/main/docs/page-center/page-center-config.request.json` |
| 077 | `lottery/buy-confirm-desc` | `消耗 {{0}} 枚碎片购买 {{1}} 次抽奖机会？` | 购买确认说明，{{0}}=碎片数，{{1}}=抽奖次数 | `apps/short/20260611-jk/pages-O/main/docs/page-center/page-center-config.request.json` |
| 078 | `lottery/node-title` | `节点 {{0}}` | 节点奖励组标题，{{0}} 为节点标识 | `apps/short/20260611-jk/pages-O/main/docs/page-center/page-center-config.request.json` |
| 079 | `share/nickname` | `{{0}}` | 戒指分享昵称 | `apps/short/20260611-jk/pages-O/main/docs/page-center/page-center-config.request.json` |
| 080 | `share/ring-no` | `NO.{{0}}` | 戒指编号 | `apps/short/20260611-jk/pages-O/main/docs/page-center/page-center-config.request.json` |
| 081 | `task/credits` | `Credits: {{}}` | 任务积分展示 | `apps/short/20260615-in/pages-I/main/docs/page-center/page-center-config.request.json` |
| 082 | `task/tab` | `DAY{{}}` | 任务弹窗 DAY Tab | `apps/short/20260615-in/pages-I/main/docs/page-center/page-center-config.request.json` |
| 083 | `lucky-bag/draw-chances` | `*Current Chances：{{}}` | 福袋剩余次数 | `apps/short/20260615-in/pages-I/main/docs/page-center/page-center-config.request.json` |
| 084 | `lottery/remain-count` | `剩余抽奖次数：{{}}` | 抽奖剩余次数 | `apps/short/20260618-recharge/pages-ck/recharge/docs/page-center/page-center-config.request.json` |
| 085 | `lottery/guarantee-progress` | `当前已累计抽奖概率 {{}}` | 保底进度百分比 | `apps/short/20260618-recharge/pages-ck/recharge/docs/page-center/page-center-config.request.json` |
| 086 | `puzzle/my-leaves` | `我的🍃：{{}}片` | 树叶余额 | `apps/short/20260618-recharge/pages-ck/recharge/docs/page-center/page-center-config.request.json` |
| 087 | `puzzle/light-cost` | `确认使用 {{}} 点亮这格拼图块吗？` | 点亮二次确认文案 | `apps/short/20260618-recharge/pages-ck/recharge/docs/page-center/page-center-config.request.json` |
| 088 | `recharge/cumulative-value` | `累计充值 {{}}` | 累充进度文案 | `apps/short/20260618-recharge/pages-ck/recharge/docs/page-center/page-center-config.request.json` |
| 089 | `tier/progress-count` | `{{}}/{{}}` | 段位进度：当前积分/下一星门槛 | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 090 | `tier/protect-need` | `距离保级还需 {{}} 分` | 保级所需积分提示 | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 091 | `rank/friend-rank` | `好友榜第 {{}} 名` | 好友榜名次（>999 显示 999+） | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 092 | `rank/national-rank` | `全国第 {{}} 名` | 全国榜名次 | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 093 | `rank/beyond-friend-star` | `超越好友还需 {{}} 颗星` | 超越最近段位好友所需星数 | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 094 | `season/title` | `S{{}} 赛季 {{}}–{{}}` | 赛季号/起止时间 | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 095 | `medal/light-success` | `恭喜成功点亮 {{}} 勋章 🎉` | 勋章点亮成功 | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 096 | `medal/rank-no` | `恭喜你成为全服第 {{}} 名兑换 {{}} 勋章的用户` | 勋章全服名次 | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 097 | `medal/tier-ring-progress` | `累计排位分：{{cur}}/{{total}}` | honor 页 1000w 段位分收集 52w 戒指行的进度文案（cur=当前累计排位分，total=门槛 1000000） | `apps/short/20260620-a/pages-A/rank/main/docs/page-center/page-center-config.request.json` |
| 098 | `dialog/compensate-title` | `确认消耗紫晶币*{{1}}进行补签吗` | 补签确认弹窗标题，{{1}}为消耗数量 | `apps/short/20260625/pages/recharge/docs/tab1/main/docs/page-center/page-center-config.request.json` |
| 099 | `signSuccess/reward` | `{{1}}×{{2}}` | 签到成功奖励文案，{{1}}名称 {{2}}数量 | `apps/short/20260625/pages/recharge/docs/tab1/main/docs/page-center/page-center-config.request.json` |
| 100 | `tab1/getTimes` | `{{count}}` | top1 次数 | `apps/short/20260626-in/pages-I/main/docs/page-center/page-center-config.request.json` |
